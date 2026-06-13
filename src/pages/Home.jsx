import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Sparkles, Camera, CreditCard, Clock, Gift, Settings } from "lucide-react";
import EventCard from "../components/events/EventCard";
import { motion } from "framer-motion";
import { formatDistanceToNow, isFuture, format } from "date-fns";
import FloatingChatbot from "../components/help/FloatingChatbot";
import OnboardingDialog from "../components/tour/OnboardingDialog";
import PullToRefresh from "../components/mobile/PullToRefresh";
import MobileConfirmDialog from "../components/mobile/MobileConfirmDialog";
import MobileAlertDialog from "../components/mobile/MobileAlertDialog";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('host');
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: "", description: "" });
  const [confirmInfo, setConfirmInfo] = useState({ open: false, title: "", description: "", onConfirm: null, variant: "default", confirmLabel: "Confirm" });

  useEffect(() => {
    loadData();
  }, []);

  // Check if should show onboarding automatically (only once ever)
  useEffect(() => {
    if (user && !loading) {
      const hasCompletedHostOnboarding = localStorage.getItem('onboarding_host_completed');
      const hasSeenOnboarding = sessionStorage.getItem('has_seen_onboarding_this_session');
      
      if (!hasCompletedHostOnboarding && !hasSeenOnboarding) {
        sessionStorage.setItem('has_seen_onboarding_this_session', 'true');
        setTimeout(() => {
          setOnboardingMode('host');
          setShowOnboarding(true);
        }, 500);
      }
    }
  }, [user, loading]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Set default trial if brand new user
      if (!currentUser.trial_ends_at && !currentUser.subscription_plan) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial
        await base44.auth.updateMe({ 
          trial_ends_at: trialEndDate.toISOString(),
          subscription_plan: 'free', // Mark as free plan during trial
          credits: 2 // Give 2 credits for trial
        });
      }
      
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      
      // Fetch user's hosted events
      const myEvents = await base44.entities.Event.filter({ host_email: updatedUser.email }, "-created_date");
      
      // Fetch events from localStorage (attended as guest)
      const storedAttendedEvents = JSON.parse(localStorage.getItem('attendedEvents') || '[]');
      const attendedEventsList = [];
      
      if (storedAttendedEvents.length > 0) {
        const allEvents = await base44.entities.Event.list();
        for (const eventId of storedAttendedEvents) {
          const event = allEvents.find(e => e.id === eventId);
          if (event && event.host_email !== updatedUser.email) { // Ensure user is not the host of an attended event
            attendedEventsList.push(event);
          }
        }
      }
      
      // For each event, fetch photos and calculate actual count
      const eventsWithCorrectCounts = await Promise.all(
        myEvents.map(async (event) => {
          try {
            const photos = await base44.entities.Photo.filter({ event_id: event.id });
            const actualCount = photos.length;
            const photoCount = photos.filter(p => !p.is_video).length; // Count only photos
            const videoCount = photos.filter(p => p.is_video).length; // Count only videos
            // Return event with correct photo/video counts (for display only, not saving to DB)
            return { ...event, photo_count: actualCount, photos: photoCount, videos: videoCount };
          } catch (error) {
            console.error(`Error fetching photos for event ${event.id}:`, error);
            // If there's an error fetching photos, keep the original count (or default to 0 for new counts)
            return { ...event, photos: 0, videos: 0 };
          }
        })
      );
      
      setEvents(eventsWithCorrectCounts);
      setAttendedEvents(attendedEventsList); // Set the new attended events state
      
      try {
        const allArticles = await base44.entities.Article.list();
        setArticles(allArticles);
      } catch (articleError) {
        console.error("Error loading articles:", articleError);
        setArticles([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = (eventId) => {
    setConfirmInfo({
      open: true,
      title: "Delete Event",
      description: "Delete this event? This will permanently delete all photos, videos, and comments. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: () => executeDeleteEvent(eventId),
    });
  };

  const executeDeleteEvent = async (eventId) => {
    setConfirmInfo(prev => ({ ...prev, open: false }));
    try {
      const photos = await base44.entities.Photo.filter({ event_id: eventId });
      
      for (const photo of photos) {
        const likes = await base44.entities.Like.filter({ photo_id: photo.id });
        for (const like of likes) {
          try { await base44.entities.Like.delete(like.id); } catch (err) { /* skip */ }
        }
        const comments = await base44.entities.Comment.filter({ photo_id: photo.id });
        for (const comment of comments) {
          try { await base44.entities.Comment.delete(comment.id); } catch (err) { /* skip */ }
        }
        const reactions = await base44.entities.Reaction.filter({ photo_id: photo.id });
        for (const reaction of reactions) {
          try { await base44.entities.Reaction.delete(reaction.id); } catch (err) { /* skip */ }
        }
        const votes = await base44.entities.Vote.filter({ photo_id: photo.id });
        for (const vote of votes) {
          try { await base44.entities.Vote.delete(vote.id); } catch (err) { /* skip */ }
        }
        try { await base44.entities.Photo.delete(photo.id); } catch (err) { /* skip */ }
      }
      
      await base44.entities.Event.delete(eventId);
      
      const lastEventId = localStorage.getItem('lastEventId');
      if (lastEventId === eventId) {
        localStorage.removeItem('lastEventId');
      }
      
      await loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to delete event. Please try again." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const userPlan = user?.subscription_plan || 'free';
  const userCredits = user?.credits || 0;
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const onTrial = trialEndsAt && trialEndsAt > new Date();
  const canShareCredits = userPlan === 'pro' || userPlan === 'business'; // Pro and Business can share
  const isAdmin = user?.role === 'admin';

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                    Welcome to Eventpix QR
                  </h1>
                  <p className="text-xl text-theme-secondary">
            Scan. Smile. Capture. Share your special moments.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOnboardingMode('host');
                setShowOnboarding(true);
              }}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              View Tutorial
            </Button>
            {isAdmin && (
              <Link to={createPageUrl("FeatureFlags")}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Feature Flags
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
        
        {user && onTrial && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-8 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <p>Your 14-day trial ends {format(trialEndsAt, "PPP")}. You have <strong>{userCredits} credits</strong>.</p>
            </div>
            <Link to={createPageUrl("Pricing")}>
              <Button size="sm" variant="outline" className="bg-white">View Plans</Button>
            </Link>
          </motion.div>
        )}

        {user && !onTrial && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 rounded-lg mb-8"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5" />
                <p>You have <span className="font-bold">{userCredits} credits</span> (2 credits = 1 event).</p>
              </div>
              <div className="flex gap-2">
                {canShareCredits && (
                  <Link to={createPageUrl("ShareCredits")}>
                    <Button size="sm" variant="outline" className="bg-white gap-2">
                      <Gift className="w-4 h-4" />
                      Share Credits
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl("Pricing")}>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">Buy More Credits</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {user && userCredits < 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8"
          >
            <p className="font-semibold">⚠️ Insufficient Credits</p>
            <p>You need at least 2 credits to create a new event. <Link to={createPageUrl("Pricing")} className="underline font-bold">Purchase credits now</Link></p>
          </motion.div>
        )}

        {/* Hosted Events Section */}
        <div className="mb-12">
          {events.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    My Events
                </h2>
                <Link to={createPageUrl("CreateEvent")}>
                  <Button variant="outline" className="gap-2" disabled={userCredits < 2}>
                    <Plus className="w-4 h-4" />
                    New Event {userCredits < 2 && "(Need 2 Credits)"}
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div key={event.id}>
                    <EventCard event={event} onDelete={handleDeleteEvent} />
                    {event.photos >= 350 && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Photo limit reached (350/350)</p>
                    )}
                    {event.videos >= 50 && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Video limit reached (50/50)</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 bg-theme-surface rounded-xl shadow-sm border border-theme"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-theme-primary mb-2">No events yet</h3>
                  <p className="text-theme-secondary mb-6">Create your first event and start collecting memories!</p>
              <Link to={createPageUrl("CreateEvent")}>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" disabled={userCredits < 2}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Event {userCredits < 2 && "(Need 2 Credits)"}
                </Button>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Attended Events Section */}
        {attendedEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
                  <Camera className="w-6 h-6 text-green-600" />
                  Events I've Attended
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {attendedEvents.map((event) => (
                <EventCard key={event.id} event={event} showDeleteButton={false} />
              ))}
            </div>
          </div>
        )}

        {articles.length > 0 && <FloatingChatbot articles={articles} />}
      </div>

      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        mode={onboardingMode}
      />
      <MobileAlertDialog
        open={alertInfo.open}
        onOpenChange={(v) => setAlertInfo(prev => ({ ...prev, open: v }))}
        title={alertInfo.title}
        description={alertInfo.description}
      />
      <MobileConfirmDialog
        open={confirmInfo.open}
        onOpenChange={(v) => setConfirmInfo(prev => ({ ...prev, open: v }))}
        title={confirmInfo.title}
        description={confirmInfo.description}
        confirmLabel={confirmInfo.confirmLabel}
        variant={confirmInfo.variant}
        onConfirm={confirmInfo.onConfirm}
      />
    </div>
    </PullToRefresh>
  );
}