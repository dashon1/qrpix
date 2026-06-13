import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Camera, QrCode, Settings, Download, Play, Award, Film, Smile, User as UserIcon, Camera as CameraIcon, BookOpen, Printer, Ticket as TicketIcon, Clock, CheckSquare, Share2, Mail, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PhotoCard from "../components/photos/PhotoCard";
import QRCodeDisplay from "../components/events/QRCodeDisplay";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "../components/ui/Confetti";
import LeaderboardDialog from "../components/events/LeaderboardDialog";
import GuestbookDialog from "../components/guestbook/GuestbookDialog";
// TVModeInstructions removed - TV Mode feature disabled
import { Hint } from "../components/ui/Hint";
import { format, addHours } from 'date-fns';
import PhotoViewerModal from "../components/photos/PhotoViewerModal";
import OnboardingDialog from "../components/tour/OnboardingDialog";
import { Badge } from "@/components/ui/badge";
import UploadToast from "../components/ui/UploadToast";
import EventIntroSlideshow from "../components/events/EventIntroSlideshow";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GameLeaderboard from "../components/games/GameLeaderboard";
import LiveGameStatus from "../components/games/LiveGameStatus";
import RecentWinnersShowcase from "../components/games/RecentWinnersShowcase";
import { Gamepad2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PullToRefresh from "../components/mobile/PullToRefresh";
import MobileFilterDrawer from "../components/photos/MobileFilterDrawer";
import MobileConfirmDialog from "../components/mobile/MobileConfirmDialog";
import MobileAlertDialog from "../components/mobile/MobileAlertDialog";


const PHOTO_TYPE_FILTERS = [
  { value: "all", label: "All", icon: CameraIcon },
  { value: "selfie", label: "Selfies", icon: UserIcon },
  { value: "group_shot", label: "Groups", icon: Smile },
];

export default function EventGallery() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showQR, setShowQR] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGuestbook, setShowGuestbook] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [dedication, setDedication] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false); // false, true, or "3/42" progress string
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ticketStatus, setTicketStatus] = useState('');
  const [showUploadToast, setShowUploadToast] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [showIntroSlideshow, setShowIntroSlideshow] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: "", description: "" });
  const [confirmInfo, setConfirmInfo] = useState({ open: false, title: "", description: "", onConfirm: null, variant: "default", confirmLabel: "Confirm" });

  const urlParams = new URLSearchParams(window.location.search);
  // Check for both camelCase and lowercase versions
  const eventId = urlParams.get("eventId") || urlParams.get("eventid");
  


  // Calculate isHost early so it's available for all functions
  const isHost = currentUser && event && (event.host_email === currentUser.email || event.co_hosts?.includes(currentUser.email));

  // Calculate filtered photos - needs to be before useEffect that uses it
  const filteredPhotos = activeFilter === 'all' ? photos : photos.filter(p => p.photo_type === activeFilter);
  const videos = photos.filter(p => p.is_video);

  useEffect(() => {
    if (eventId) {
      localStorage.setItem('lastEventId', eventId);
      
      // Track this event for guests (attended events)
      const attendedEvents = JSON.parse(localStorage.getItem('attendedEvents') || '[]');
      if (!attendedEvents.includes(eventId)) {
        attendedEvents.push(eventId);
        localStorage.setItem('attendedEvents', JSON.stringify(attendedEvents));
      }
      
      loadData();
      const interval = setInterval(loadPhotos, 30000); // Poll every 30s instead of 5s to avoid rate limits
      
      return () => clearInterval(interval);
    } else {
      console.error("[EventGallery] No eventId found in URL");
      setLoading(false);
    }
  }, [eventId]);

  // Check if intro slideshow should be shown - ONLY for regular gallery view
  useEffect(() => {
    // Completely disable intro slideshow - users reported getting stuck
    // Can be re-enabled later with better UX
    return;
    
    /* DISABLED FOR NOW - CAUSING MOBILE ISSUES
    const currentPath = window.location.pathname;
    const isTVMode = currentPath.includes('TVMode');
    const isSlideshow = currentPath.includes('Slideshow');
    const isTimeline = currentPath.includes('Timeline');
    
    if (isTVMode || isSlideshow || isTimeline) {
      return;
    }
    
    if (event && !loading && eventId) {
      const hasSeenIntro = sessionStorage.getItem(`intro_shown_${eventId}`);
      if (!hasSeenIntro) {
        setShowIntroSlideshow(true);
      }
    }
    */
  }, [event, loading, eventId]);

  const handleCloseIntroSlideshow = () => {
    sessionStorage.setItem(`intro_shown_${eventId}`, 'true');
    setShowIntroSlideshow(false);
    // Auto-start regular slideshow after intro
    if (filteredPhotos.length > 0) {
      setSlideshowActive(true);
      setSlideshowIndex(0);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!event) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const eventStart = event.start_date ? new Date(event.start_date) : null;
      const ticketSaleStart = event.ticket_sale_start_date ? new Date(event.ticket_sale_start_date) : null;
      const eventExpiration = event.expiration_date ? new Date(event.expiration_date) : null;
      
      let currentTicketStatus = '';
      let targetDateForCountdown = null;
      
      // Determine current status and what to count down to
      if (eventStart && now < eventStart) {
        // Event hasn't started yet - countdown to event start
        currentTicketStatus = 'before-event';
        targetDateForCountdown = eventStart;
      } else if (ticketSaleStart && now < ticketSaleStart) {
        // Event started but tickets not on sale yet
        currentTicketStatus = 'pre-sale';
        targetDateForCountdown = ticketSaleStart;
      } else if (eventExpiration && now < eventExpiration) {
        // Event is live - countdown to event end
        currentTicketStatus = 'live';
        targetDateForCountdown = eventExpiration;
      } else if (eventExpiration && now >= eventExpiration) {
        // Event has ended
        currentTicketStatus = 'ended';
        targetDateForCountdown = null;
      } else {
        // No specific dates set, assume live
        currentTicketStatus = 'live';
        targetDateForCountdown = null;
      }
      
      setTicketStatus(currentTicketStatus);
      
      if (targetDateForCountdown) {
        const diff = targetDateForCountdown.getTime() - now.getTime();
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setCountdown({ days, hours, minutes, seconds });
        } else {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [event]);

  // Separate effect for onboarding check - only runs once when currentUser is known
  useEffect(() => {
    // Only proceed if onboarding hasn't been shown and data has finished loading (so currentUser is stable)
    if (!hasShownOnboarding && !loading) {
      const hasCompletedGuestOnboarding = localStorage.getItem('onboarding_guest_completed');
      if (!currentUser && !hasCompletedGuestOnboarding) {
        // Show guest onboarding for non-logged-in users after delay
        setTimeout(() => {
          setShowOnboarding(true);
          setHasShownOnboarding(true); // Mark as shown to prevent re-triggering
        }, 1000);
      } else if (currentUser || hasCompletedGuestOnboarding) {
        // If user is logged in or has completed onboarding, mark as shown so it doesn't try again
        setHasShownOnboarding(true);
      }
    }
  }, [currentUser, loading, hasShownOnboarding]);

  // Add slideshow effect
  useEffect(() => {
    if (!slideshowActive || filteredPhotos.length === 0) return;

    const interval = setInterval(() => {
      setSlideshowIndex(prev => (prev + 1) % filteredPhotos.length);
    }, 3000); // Change photo every 3 seconds

    return () => clearInterval(interval);
  }, [slideshowActive, filteredPhotos.length]);

  const handleToggleSelection = (photoId) => {
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.length === filteredPhotos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(filteredPhotos.map(p => p.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPhotoIds.length === 0) {
      setAlertInfo({ open: true, title: "No Selection", description: "Please select at least one photo to delete." });
      return;
    }
    setConfirmInfo({
      open: true,
      title: "Delete Photos",
      description: `Are you sure you want to permanently delete ${selectedPhotoIds.length} photo(s)? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: executeDeleteSelected,
    });
  };

  const executeDeleteSelected = async () => {
    setConfirmInfo(prev => ({ ...prev, open: false }));
    try {
      for (const photoId of selectedPhotoIds) {
        await base44.entities.Photo.delete(photoId);
      }
      if (isHost) {
        try {
          const newPhotoCount = Math.max(0, (event.photo_count || 0) - selectedPhotoIds.length);
          await base44.entities.Event.update(eventId, { photo_count: newPhotoCount });
          setEvent(prev => ({ ...prev, photo_count: newPhotoCount }));
        } catch (updateError) {
          console.log("Could not update photo count:", updateError.message);
        }
      }
      setAlertInfo({ open: true, title: "Deleted", description: `Successfully deleted ${selectedPhotoIds.length} photo(s).` });
      setSelectedPhotoIds([]);
      setSelectionMode(false);
      await loadPhotos();
    } catch (error) {
      console.error("Error deleting selected photos:", error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to delete some photos. Please try again." });
    }
  };

  const handleShareSelected = async (sendViaEmail = false) => {
    if (selectedPhotoIds.length === 0) {
      setAlertInfo({ open: true, title: "No Selection", description: "Please select at least one photo to share." });
      return;
    }

    setIsSharing(true);
    try {
      const emails = sendViaEmail && recipientEmails.trim() 
        ? recipientEmails.split(/[\n,;]/).map(e => e.trim()).filter(e => e)
        : null;

      const response = await base44.functions.invoke('shareSelectedPhotos', {
        eventId: eventId,
        photoIds: selectedPhotoIds,
        recipientEmails: emails
      });

      if (emails && emails.length > 0) {
        setAlertInfo({ open: true, title: "Sent!", description: `Photo package sent to ${emails.length} recipient(s)! You can also view it in your email.` });
        setShowShareDialog(false);
        setRecipientEmails("");
      } else {
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers['content-disposition'];
        let filename = `${event.name}_selected_photos.zip`;
        if (contentDisposition) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) { 
              filename = matches[1].replace(/['"]/g, '');
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }

      setSelectionMode(false);
      setSelectedPhotoIds([]);
    } catch (error) {
      console.error('Error sharing photos:', error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to share photos. Please try again." });
    }
    setIsSharing(false);
  };

  const handleBuyTicket = async () => {
    if (!currentUser) {
      setConfirmInfo({
        open: true,
        title: "Login Required",
        description: "You need to log in to purchase tickets. Would you like to log in now?",
        confirmLabel: "Log In",
        variant: "default",
        onConfirm: () => {
          setConfirmInfo(prev => ({ ...prev, open: false }));
          base44.auth.redirectToLogin(window.location.href);
        }
      });
      return;
    }

    if (event.ticket_price === 0) {
      try {
        const response = await base44.functions.invoke('registerFreeTicket', {
          eventId: eventId,
          quantity: 1
        });
        if (response.data.success) {
          setAlertInfo({ open: true, title: "Registered!", description: `Registration successful! Your ticket has been sent to ${currentUser.email}` });
          await loadData();
        } else {
          throw new Error(response.data.error || "Registration failed");
        }
      } catch (error) {
        console.error('Error registering for free event:', error);
        setAlertInfo({ open: true, title: "Error", description: "Failed to register. Please try again." });
      }
      return;
    }

    try {
      const response = await base44.functions.invoke('createEventTicketCheckout', {
        eventId: eventId,
        quantity: 1
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to process ticket purchase. Please try again." });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let user = null;
      try {
        user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
        setCurrentUser(null);
      }
      
      if (!eventId) {
        console.error("No eventId provided in URL");
        return;
      }

      console.log("Loading event with ID:", eventId);
      const foundEvent = await base44.entities.Event.get(eventId);
      console.log("Event loaded:", foundEvent ? foundEvent.name : "not found");
      
      if (!foundEvent) {
        console.error("Event not found with ID:", eventId);
        setEvent(null);
      } else {
        console.log("Event found:", foundEvent);
        setEvent(foundEvent);
        await loadPhotos();
        
        // Only sync photo count if user is host/co-host - no DB update on guest view
        const userIsHost = user && (foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email));
        
        if (userIsHost) {
          try {
            const photoData = await base44.entities.Photo.filter({ event_id: eventId });
            const actualCount = photoData.length;
            if (foundEvent.photo_count !== actualCount) {
              await base44.entities.Event.update(eventId, { photo_count: actualCount });
              setEvent(prev => ({ ...prev, photo_count: actualCount }));
            }
          } catch (updateError) {
            // Silently fail - photo count sync is not critical for page load
            console.log("Could not sync photo count:", updateError.message);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Can't use state-based alert before render, so this stays as-is for initial load
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!eventId) return;
    try {
      const photoData = await base44.entities.Photo.filter({ event_id: eventId }, "-created_date");
      
      // Check for new photos to show toast notification
      if (photos.length > 0 && photoData.length > photos.length) {
        const newPhoto = photoData[0]; // Most recent photo based on "-created_date" sort
        if (newPhoto.uploaded_by !== currentUser?.email) { // Don't show toast for current user's own uploads
          setLastUpload({
            name: newPhoto.uploader_name,
            url: newPhoto.image_url,
            isVideo: newPhoto.is_video
          });
          setShowUploadToast(true);
          setTimeout(() => setShowUploadToast(false), 4000);
        }
      }
      
      setPhotos(photoData);
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList); // Convert FileList to array
    
    if (!currentUser) {
      setConfirmInfo({
        open: true,
        title: "Login Required",
        description: "You need to log in to upload content. Would you like to log in now?",
        confirmLabel: "Log In",
        variant: "default",
        onConfirm: () => {
          setConfirmInfo(prev => ({ ...prev, open: false }));
          base44.auth.redirectToLogin(window.location.href);
        }
      });
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        
        try {
          const isVideo = file.type.startsWith('video/');
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          
          let aiTags = [], aiDescription = "", photoType = "other";
          
          if (!isVideo && event.ai_tagging_enabled) {
            try {
              const aiResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Analyze this image and determine what type it is:

TYPE A = Promotional flyer, invitation, or informational graphic (has text overlays, event details, graphics, designed layout)
TYPE B = Actual photo of people/moments from the event (shows real people, candid shots, activities)

Then write a description:

FOR TYPE A (Flyer/Promotional):
Write 3-4 sentences focusing on the INTENT and INVITATION. What is this promoting? What's the call to action? Use phrases like "Get ready for...", "Join us for...", "Don't miss...", "RSVP now...", etc. Be warm and inviting.

Example: "Get ready for a lively evening of fun and games at the 'Drunken Bingo Fall Birthday Bash'! This invite-only event promises an unforgettable night filled with laughter, exciting prizes, and delicious drinks—perfect for celebrating birthdays in style. Join us on November 15 at 621 15th Avenue North in Safety Harbor for a chance to win up to $100 in various bingo games while enjoying the cozy autumn decorations and warm lighting create the perfect atmosphere for this memorable birthday celebration."

FOR TYPE B (Real Photo):
Write 3-4 sentences in a storytelling narrative style. Describe what you SEE happening in the photo - the people, their emotions, the activities, the atmosphere. Be descriptive and warm.

Example: "A group of friends gather around the table, their faces lit with excitement as they mark their bingo cards. Laughter fills the room as someone calls out 'Bingo!' while others groan playfully. The cozy autumn decorations and warm lighting create the perfect atmosphere for this memorable birthday celebration."

Keep your description concise and engaging. Return the result as JSON with description, tags, and photo_type.`,
                file_urls: [file_url],
                response_json_schema: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    photo_type: { type: "string", enum: ["selfie", "group_shot", "scenery", "food", "action", "other"] }
                  }
                }
              });
              aiDescription = aiResult.description || "";
              aiTags = aiResult.tags || [];
              photoType = aiResult.photo_type || "other";
            } catch (error) {
              console.error("AI tagging failed:", error);
            }
          }
          
          const photoData = {
            event_id: eventId,
            image_url: file_url,
            is_video: isVideo,
            caption: caption,
            dedication: dedication,
            uploaded_by: currentUser.email,
            uploader_name: currentUser.full_name,
            like_count: 0,
            comment_count: 0,
            votes: 0,
            ai_tags: aiTags,
            ai_description: aiDescription,
            photo_type: photoType,
            is_approved: !event.requires_approval
          };
          
          await base44.entities.Photo.create(photoData);
          successCount++;
        } catch (error) {
          console.error(`Error uploading file ${i + 1} (${file.name}):`, error);
          failCount++;
        }
      }

      // Update photo count if host
      const userIsHostNow = currentUser && event && (event.host_email === currentUser.email || event.co_hosts?.includes(currentUser.email));
      
      if (userIsHostNow && successCount > 0) {
        try {
          const newPhotoCount = (event.photo_count || 0) + successCount;
          await base44.entities.Event.update(eventId, { photo_count: newPhotoCount });
          setEvent(prev => ({...prev, photo_count: newPhotoCount}));
          
          // Trigger confetti if total count hits a milestone, or for the first few photo(s)
          if (newPhotoCount % 10 === 0 || (newPhotoCount - successCount) < 10) { // Confetti on every upload until 10, then every 10th
            setConfettiTrigger(Date.now());
          }
        } catch (updateError) {
          console.log("Could not update photo count:", updateError.message);
        }
      } else if (successCount > 0) { // For non-hosts, trigger confetti on any successful upload
        setConfettiTrigger(Date.now());
      }
      
      setCaption("");
      setDedication("");
      await loadPhotos();
      
      if (files.length > 1) {
        setAlertInfo({ open: true, title: "Upload Complete", description: `✅ Successful: ${successCount}${failCount > 0 ? `\n❌ Failed: ${failCount}` : ''}` });
      }
    } catch (error) {
      console.error("An unexpected error occurred during multi-file upload process:", error);
      if (files.length === 1 && failCount === 0) {
         setAlertInfo({ open: true, title: "Error", description: "Failed to upload photo. Please try again." });
      } else if (files.length > 1 && successCount === 0) {
         setAlertInfo({ open: true, title: "Error", description: "Failed to upload any photos. Please try again." });
      }
    }
    
    setUploading(false);
    setUploadProgress({ current: 0, total: 0 });
  };

  const handleDelete = async (photoId) => {
    try {
      await base44.entities.Photo.delete(photoId);
      
      // Check host status directly here using current state
      const userIsHostNow = currentUser && event && (event.host_email === currentUser.email || event.co_hosts?.includes(currentUser.email));
      
      if (userIsHostNow) {
        try {
          const newPhotoCount = Math.max(0, (event.photo_count || 0) - 1);
          await base44.entities.Event.update(eventId, { photo_count: newPhotoCount });
          setEvent(prev => ({...prev, photo_count: newPhotoCount}));
        } catch (updateError) {
          console.log("Could not update photo count:", updateError.message);
        }
      }
      
      await loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to delete photo. Please try again." });
    }
  };

  const [downloadAllPhotos, setDownloadAllPhotos] = useState([]);
  const [showDownloadAllConfirm, setShowDownloadAllConfirm] = useState(false);

  const handleDownloadAll = async () => {
    if (!allowDownloads) return;
    
    const allPhotos = await base44.entities.Photo.filter({ event_id: eventId }, '-created_date');
    
    if (allPhotos.length === 0) {
      setAlertInfo({ open: true, title: "No Photos", description: "No photos found to download." });
      return;
    }

    setDownloadAllPhotos(allPhotos);
    setShowDownloadAllConfirm(true);
  };

  const executeDownloadAll = async () => {
    setShowDownloadAllConfirm(false);
    const allPhotos = downloadAllPhotos;
    if (allPhotos.length === 0) return;

    setIsDownloadingAll(true);
    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < allPhotos.length; i++) {
      setIsDownloadingAll(`${i + 1}/${allPhotos.length}`);
      const photo = allPhotos[i];
      try {
        const response = await fetch(photo.image_url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const urlPath = new URL(photo.image_url).pathname;
        const ext = urlPath.split('.').pop() || (photo.is_video ? 'mp4' : 'jpg');
        a.download = `${(event.name || 'event').replace(/[^a-z0-9]/gi, '_')}_${String(i + 1).padStart(4, '0')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        downloaded++;
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Failed to download file ${i + 1}:`, err);
        failed++;
      }
    }

    setIsDownloadingAll(false);
    if (failed > 0) {
      setAlertInfo({ open: true, title: "Download Complete", description: `✅ Downloaded: ${downloaded}\n❌ Failed: ${failed}\n\nTip: If many failed, try downloading in smaller batches using Select Photos.` });
    }
  };

  const handlePhotoClick = (photo) => {
    setViewerPhoto(photo);
    setShowViewer(true);
  };

  const handleViewerNavigate = (photo) => {
    setViewerPhoto(photo);
  };

  const handleGetDirections = () => {
    if (event.location_address) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}`;
      window.open(mapsUrl, '_blank');
    }
  };


  
  const handleShareAttempt = () => {
    setAlertInfo({ open: true, title: "Hosts Only", description: "Only event hosts can share the QR code and invite link.\n\nIf you're an attendee and want to invite someone, please ask the event host to send them an invitation!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Safety check - if still loading, show loader
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If not loading and no event found, show error
  if (!eventId || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          {!currentUser ? (
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Log In to See Your Events
            </Button>
          ) : (
            <Button onClick={() => navigate(createPageUrl("Home"))} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Go to My Events
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Check if event is expired and within grace period
  const now = new Date();
  const expirationDate = event.expiration_date ? new Date(event.expiration_date) : null;
  const isExpired = expirationDate && now > expirationDate;
  
  const gracePeriodEnd = expirationDate ? addHours(expirationDate, 72) : null;
  const isWithinGracePeriod = gracePeriodEnd && now <= gracePeriodEnd;
  
  const uploadsAllowed = !isExpired || (event.allow_post_event_uploads && isWithinGracePeriod);
  
  // CRITICAL: Only hosts/co-hosts OR explicitly enabled downloads should allow downloads
  // Default should be FALSE (secure) unless explicitly set to true
  const allowDownloads = isHost || (event.allow_downloads === true);
  
  // Calculate remaining tickets
  const ticketsRemaining = event.max_tickets ? event.max_tickets - (event.tickets_sold || 0) : null;
  const isSoldOut = ticketsRemaining !== null && ticketsRemaining <= 0;

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen">
      {/* Intro Slideshow - DISABLED */}
      {/* 
      <AnimatePresence>
        {showIntroSlideshow && event && (
          <EventIntroSlideshow
            event={event}
            onClose={handleCloseIntroSlideshow}
          />
        )}
      </AnimatePresence>
      */}

      <Confetti trigger={confettiTrigger} />
      <UploadToast 
        show={showUploadToast} 
        uploaderName={lastUpload?.name}
        photoUrl={lastUpload?.url}
        isVideo={lastUpload?.isVideo}
      />
      <div className="relative h-64 bg-gradient-to-br overflow-hidden" style={{ background: `linear-gradient(135deg, ${event.theme_color} 0%, ${event.theme_color}dd 100%)` }}>
        {event.cover_image_url && <img src={event.cover_image_url} alt={event.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-6 md:pb-8">
          {currentUser && (
            <Button variant="ghost" onClick={() => navigate(createPageUrl("Home"))} className="absolute top-4 left-4 text-white hover:bg-white/20 text-sm md:text-base">
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
          )}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {event.logo_url && <img src={event.logo_url} alt={`${event.name} Logo`} className="hidden md:block w-16 h-16 md:w-20 md:h-20 rounded-lg object-contain bg-white/20 p-1 shadow-lg flex-shrink-0" />}
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-white mb-2">{event.name}</h1>
                {event.description && <p className="text-white/90 text-sm md:text-base lg:text-lg">{event.description}</p>}
                {(event.start_date || event.expiration_date) && (
                  <div className="mt-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                    <p className="text-white/90 text-xs md:text-sm">
                      📅 {event.start_date && format(new Date(event.start_date), "MMM d, yyyy 'at' h:mm a")}
                      {event.start_date && event.expiration_date && " - "}
                      {event.expiration_date && format(new Date(event.expiration_date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
                {event.location_address && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGetDirections}
                    className="mt-2 gap-2 bg-white/90 hover:bg-white text-xs md:text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Get Directions
                    <Hint content="Opens Google Maps with directions to the event location" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {event.is_paid_event && !isHost && (
                <Button 
                  onClick={handleBuyTicket}
                  disabled={ticketStatus === 'pre-sale' || ticketStatus === 'ended' || isSoldOut || ticketStatus === 'before-event'}
                  className={`gap-2 text-xs md:text-sm ${
                    ticketStatus === 'pre-sale' || ticketStatus === 'before-event'
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : ticketStatus === 'ended' || isSoldOut
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  }`}
                >
                  <TicketIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {ticketStatus === 'before-event'
                      ? `Event Starts ${format(new Date(event.start_date), 'MMM d, h:mm a')}`
                      : ticketStatus === 'pre-sale' && event.ticket_sale_start_date
                      ? `Sales Start ${format(new Date(event.ticket_sale_start_date), 'MMM d, h:mm a')}`
                      : ticketStatus === 'ended'
                      ? 'Sales Closed'
                      : isSoldOut
                      ? 'Sold Out'
                      : event.ticket_price === 0 
                      ? 'Register (Free)' 
                      : `Buy Ticket - $${event.ticket_price}`
                    }
                  </span>
                  <span className="sm:hidden">
                    {ticketStatus === 'before-event' ? 'Soon' :
                     ticketStatus === 'pre-sale' ? 'Soon' :
                     ticketStatus === 'ended' ? 'Closed' :
                     isSoldOut ? 'Sold Out' :
                     event.ticket_price === 0 ? 'Free' : `$${event.ticket_price}`
                    }
                  </span>
                  <Hint content={
                    ticketStatus === 'before-event'
                      ? "Event hasn't started yet. Check back soon!"
                      : ticketStatus === 'pre-sale' 
                      ? "Ticket sales haven't started yet. Check back soon!" 
                      : ticketStatus === 'ended'
                      ? "Event has ended and ticket sales are closed."
                      : isSoldOut
                      ? "All tickets have been sold out."
                      : event.ticket_price === 0 
                      ? "Register for free and get your ticket instantly via email." 
                      : "Purchase your ticket now and get instant access via email."
                  } />
                </Button>
              )}
              {event.print_service_enabled && (
                <Button variant="secondary" onClick={() => navigate(createPageUrl(`PrintShop?eventId=${eventId}`))} className="gap-2 text-xs md:text-sm">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print Shop</span><Hint content="Order custom prints, mugs, apparel and more with your event photos." />
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate(createPageUrl(`Timeline?eventId=${eventId}`))} className="gap-2 text-xs md:text-sm">
                <Film className="w-4 h-4" /><span className="hidden sm:inline">Timeline</span><Hint content="View all photos in a cinematic, full-screen scrolling feed with music." />
              </Button>
  
              <Button variant="secondary" onClick={() => navigate(createPageUrl(`Slideshow?eventId=${eventId}`))} className="gap-2 text-xs md:text-sm">
                <Play className="w-4 h-4" /><span className="hidden sm:inline">Slideshow</span><Hint content="Start a dynamic slideshow of all event photos." />
              </Button>
              {videos.length > 0 && (
                <Button variant="secondary" onClick={() => navigate(createPageUrl(`VideoSlideshow?eventId=${eventId}`))} className="gap-2 text-xs md:text-sm">
                  <Film className="w-4 h-4" /><span className="hidden sm:inline">Videos</span><Hint content="Play all event videos in sequence." />
                </Button>
              )}
              {event.guestbook_enabled && (
                <Button variant="secondary" onClick={() => setShowGuestbook(true)} className="gap-2 text-xs md:text-sm">
                  <BookOpen className="w-4 h-4" /><span className="hidden sm:inline">Guestbook</span><Hint content="Read and write messages in the event guestbook." />
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowLeaderboard(true)} className="gap-2 text-xs md:text-sm">
                <Award className="w-4 h-4" /><span className="hidden sm:inline">Leaderboard</span><Hint content="See the top contributing guests and the most-liked photos from the event." />
              </Button>
              {isHost ? (
                <Button variant="secondary" onClick={() => setShowQR(true)} className="gap-2 text-xs md:text-sm">
                  <QrCode className="w-4 h-4" /><span className="hidden sm:inline">Share</span><Hint content="Generate a QR code and link to easily invite more guests to upload and view photos." />
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleShareAttempt} className="gap-2 text-xs md:text-sm">
                  <QrCode className="w-4 h-4" /><span className="hidden sm:inline">Share</span><Hint content="Share this event with others" />
                </Button>
              )}
              
              {isHost && <Button variant="secondary" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))} className="gap-2 text-xs md:text-sm">
                <Settings className="w-4 h-4" /><span className="hidden sm:inline">Manage</span><Hint content="Access event settings, moderate photos, and manage co-hosts." />
              </Button>}
            </div>
          </div>
        </div>
      </div>
      
      {/* Countdown and Ticket Count Section - Only show if enabled and for paid events */}
      {event.is_paid_event && !isHost && event.show_countdown_timer !== false && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 md:mt-6">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Countdown Timer */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
                  <Clock className="w-4 h-4 md:w-5 md:h-5" />
                  <h3 className="text-base md:text-lg font-semibold">
                    {ticketStatus === 'before-event'
                      ? 'Event Starts In'
                      : ticketStatus === 'pre-sale' 
                      ? 'Ticket Sales Begin In' 
                      : ticketStatus === 'live' && expirationDate
                      ? 'Event Ends In'
                      : ticketStatus === 'ended'
                      ? 'Event Has Ended'
                      : 'Event Status'
                    }
                  </h3>
                </div>
                {(countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0) && (ticketStatus === 'before-event' || ticketStatus === 'pre-sale' || ticketStatus === 'live') ? (
                  <div className="flex justify-center gap-2 md:gap-4">
                    {countdown.days > 0 && (
                      <div className="bg-white/20 rounded-lg p-2 md:p-3 min-w-[50px] md:min-w-[70px]">
                        <div className="text-xl md:text-3xl font-bold">{countdown.days}</div>
                        <div className="text-[10px] md:text-xs uppercase">Days</div>
                      </div>
                    )}
                    <div className="bg-white/20 rounded-lg p-2 md:p-3 min-w-[50px] md:min-w-[70px]">
                      <div className="text-xl md:text-3xl font-bold">{countdown.hours}</div>
                      <div className="text-[10px] md:text-xs uppercase">Hours</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 md:p-3 min-w-[50px] md:min-w-[70px]">
                      <div className="text-xl md:text-3xl font-bold">{countdown.minutes}</div>
                      <div className="text-[10px] md:text-xs uppercase">Mins</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 md:p-3 min-w-[50px] md:min-w-[70px]">
                      <div className="text-xl md:text-3xl font-bold">{countdown.seconds}</div>
                      <div className="text-[10px] md:text-xs uppercase">Secs</div>
                    </div>
                  </div>
                ) : ticketStatus === 'live' && !(expirationDate || event.ticket_sale_start_date) ? (
                  <Badge className="bg-green-500 text-white text-base md:text-lg px-3 py-1 md:px-4 md:py-2">Live Now!</Badge>
                ) : ticketStatus === 'ended' ? (
                  <Badge className="bg-gray-500 text-white text-base md:text-lg px-3 py-1 md:px-4 md:py-2">Ended</Badge>
                ) : null}
              </div>
              
              {/* Ticket Count */}
              {ticketsRemaining !== null && (
                <div className="text-center md:border-l border-white/20 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0">
                  <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
                    <TicketIcon className="w-4 h-4 md:w-5 md:h-5" />
                    <h3 className="text-base md:text-lg font-semibold">Tickets Available</h3>
                  </div>
                  {isSoldOut ? (
                    <div>
                      <Badge className="bg-red-500 text-white text-lg md:text-2xl px-4 py-2 md:px-6 md:py-3 mb-2">SOLD OUT</Badge>
                      <p className="text-xs md:text-sm text-white/80">All {event.max_tickets} tickets have been sold</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl md:text-5xl font-bold mb-2">{ticketsRemaining}</div>
                      <p className="text-xs md:text-sm text-white/80">
                        out of {event.max_tickets} remaining
                      </p>
                      <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(ticketsRemaining / event.max_tickets) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Live Game Status Banner */}
        <LiveGameStatus eventId={eventId} />

        {/* Recent Winners Showcase */}
        <RecentWinnersShowcase eventId={eventId} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />Add Your Photos & Videos
            </h2>
            {!currentUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm">
                  👋 <strong>Welcome!</strong> Please <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="underline font-semibold">log in</button> to upload content to this event.
                </p>
              </div>
            )}
            {isExpired && !uploadsAllowed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">
                  ⏰ <strong>Event Expired</strong> - This event ended on {format(expirationDate, "PPP 'at' p")} and is no longer accepting uploads.
                  {isHost && (
                    <span className="block mt-2">
                      💡 <strong>Host Tip:</strong> Go to <button onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))} className="underline font-semibold">Manage Event</button> and enable the "72-Hour Upload Window" to allow late uploads!
                    </span>
                  )}
                </p>
              </div>
            )}
            {isExpired && uploadsAllowed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm">
                  📸 <strong>Extended Upload Window Active!</strong> This event ended on {format(expirationDate, "PPP 'at' p")}, but uploads are still allowed until {format(gracePeriodEnd, "PPP 'at' p")} (72 hours after event end). Upload your late photos now!
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)..." disabled={!currentUser || !uploadsAllowed || uploading} />
              <Input value={dedication} onChange={(e) => setDedication(e.target.value)} placeholder="Dedicate this to someone..." disabled={!currentUser || !uploadsAllowed || uploading} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" capture="user" onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
              
              <Button onClick={() => cameraInputRef.current?.click()} disabled={uploading || !currentUser || !uploadsAllowed} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Camera className="w-4 h-4" />Take Photo
              </Button>
              <Button onClick={() => videoInputRef.current?.click()} disabled={uploading || !currentUser || !uploadsAllowed} className="gap-2 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700">
                <Film className="w-4 h-4" />Record Video
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || !currentUser || !uploadsAllowed} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />Choose Files
              </Button>
            </div>
            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-purple-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  <span className="font-medium">
                    Uploading {uploadProgress.current} of {uploadProgress.total}...
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Event Games Leaderboard - Show above photos */}
        <div className="mb-8">
          <GameLeaderboard eventId={eventId} />
        </div>

        {/* Quick Links for Hosts */}
        {isHost && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button 
                    onClick={() => navigate(createPageUrl(`GameManagement?eventId=${eventId}`))}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Manage Games
                  </Button>
                  <Button 
                    onClick={() => navigate(createPageUrl(`GameHostDashboard?eventId=${eventId}`))}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Host Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6 text-purple-600" />Event Photos ({photos.length})
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              {isHost && (
                <>
                  <Button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      setSelectedPhotoIds([]);
                    }}
                    variant={selectionMode ? "default" : "outline"}
                    className="gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {selectionMode ? 'Cancel Selection' : 'Select Photos'}
                  </Button>
                  {selectionMode && (
                    <>
                      <Button
                        onClick={handleSelectAll}
                        variant="outline"
                        className="gap-2"
                      >
                        {selectedPhotoIds.length === filteredPhotos.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button
                        onClick={handleDeleteSelected}
                        disabled={selectedPhotoIds.length === 0}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected ({selectedPhotoIds.length})
                      </Button>
                      <Button
                        onClick={() => setShowShareDialog(true)}
                        disabled={selectedPhotoIds.length === 0}
                        className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Selected ({selectedPhotoIds.length})
                      </Button>
                    </>
                  )}
                </>
              )}
              {filteredPhotos.length > 0 && !selectionMode && (
                <Button
                  onClick={() => {
                    setSlideshowActive(!slideshowActive);
                    setSlideshowIndex(0);
                  }}
                  variant={slideshowActive ? "default" : "outline"}
                  className={`gap-2 ${slideshowActive ? 'bg-purple-600 text-white shadow' : ''}`}
                >
                  <Play className="w-4 h-4" />
                  {slideshowActive ? 'Stop' : 'Start'} Slideshow
                </Button>
              )}
              {allowDownloads && photos.length > 0 && !selectionMode && (
                <Button variant="outline" onClick={handleDownloadAll} disabled={isDownloadingAll} className="gap-2">
                  <Download className="w-4 h-4" />{isDownloadingAll ? (typeof isDownloadingAll === 'string' ? `Downloading ${isDownloadingAll}` : "Preparing...") : "Download All"}
                </Button>
              )}
              {!selectionMode && (
                <>
                  {/* Desktop filter buttons */}
                  <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    {PHOTO_TYPE_FILTERS.map(filter => (
                      <Button key={filter.value} size="sm" variant={activeFilter === filter.value ? 'default' : 'ghost'} onClick={() => setActiveFilter(filter.value)} className={`gap-2 ${activeFilter === filter.value ? 'bg-purple-600 text-white shadow' : ''}`}>
                        <filter.icon className="w-4 h-4" />{filter.label}
                      </Button>
                    ))}
                    <Hint content="Use our 'Magic' AI filters to quickly sort through photos." />
                  </div>
                  {/* Mobile filter drawer */}
                  <MobileFilterDrawer
                    filters={PHOTO_TYPE_FILTERS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </>
              )}
            </div>
          </div>

          {slideshowActive && filteredPhotos.length > 0 ? (
            <div className="relative">
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ height: '70vh' }}>
                <AnimatePresence mode="wait">
                  {filteredPhotos[slideshowIndex] && (
                    <motion.div
                      key={slideshowIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      {filteredPhotos[slideshowIndex].is_video ? (
                        <video
                          src={filteredPhotos[slideshowIndex].image_url}
                          className="max-w-full max-h-full object-contain"
                          autoPlay
                          muted
                          loop // Loop video in slideshow
                        />
                      ) : (
                        <img
                          src={filteredPhotos[slideshowIndex].image_url}
                          alt={filteredPhotos[slideshowIndex].caption}
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                        {filteredPhotos[slideshowIndex].caption && (
                          <p className="text-xl mb-2">{filteredPhotos[slideshowIndex].caption}</p>
                        )}
                        <p className="text-sm opacity-80">
                          By {filteredPhotos[slideshowIndex].uploader_name}
                        </p>
                      </div>
                      <div className="absolute top-4 right-4 bg-black/50 px-3 py-2 rounded-full text-white text-sm">
                        {slideshowIndex + 1} / {filteredPhotos.length}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  onClick={() => setSlideshowIndex(prev => (prev - 1 + filteredPhotos.length) % filteredPhotos.length)}
                  variant="outline"
                >
                  ← Previous
                </Button>
                <Button
                  onClick={() => setSlideshowActive(false)}
                  variant="destructive"
                >
                  Exit Slideshow
                </Button>
                <Button
                  onClick={() => setSlideshowIndex(prev => (prev + 1) % filteredPhotos.length)}
                  variant="outline"
                >
                  Next →
                </Button>
              </div>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-purple-600" />
              </div>
              <p className="text-gray-600 text-lg">No photos yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredPhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedPhotoIds.includes(photo.id)}
                          onCheckedChange={() => handleToggleSelection(photo.id)}
                          className="w-6 h-6 bg-white border-2 border-purple-600"
                        />
                      </div>
                    )}
                    <PhotoCard 
                      photo={photo} 
                      onDelete={handleDelete} 
                      isHost={isHost} 
                      contestMode={event.contest_mode} 
                      allowDownloads={allowDownloads}
                      showAiDescriptions={event.show_ai_descriptions}
                      allPhotos={filteredPhotos}
                      onPhotoClick={handlePhotoClick}
                      event={event}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Selected Photos ({selectedPhotoIds.length})</DialogTitle>
            <DialogDescription>
              Download photos as a ZIP file or send them via email to your guests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipientEmails" className="text-sm font-semibold mb-2 block">Send to Email (optional)</Label>
              <Textarea
                id="recipientEmails"
                placeholder="guest1@example.com, guest2@example.com&#10;guest3@example.com"
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">Separate multiple emails with commas, semicolons, or new lines. Leave blank to download directly.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleShareSelected(false)}
              disabled={isSharing}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isSharing ? "Processing..." : "Download ZIP"}
            </Button>
            {recipientEmails.trim() && (
              <Button 
                onClick={() => handleShareSelected(true)}
                disabled={isSharing}
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Mail className="w-4 h-4" />
                {isSharing ? "Sending..." : "Send via Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRCodeDisplay open={showQR} onOpenChange={setShowQR} event={event} />
      <LeaderboardDialog open={showLeaderboard} onOpenChange={setShowLeaderboard} eventId={eventId} />
      <GuestbookDialog open={showGuestbook} onOpenChange={setShowGuestbook} event={event} currentUser={currentUser} />
      <PhotoViewerModal
        photo={viewerPhoto}
        photos={filteredPhotos}
        open={showViewer}
        onOpenChange={setShowViewer}
        onNavigate={handleViewerNavigate}
        allowDownloads={allowDownloads}
      />

      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        mode="guest"
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
      <MobileConfirmDialog
        open={showDownloadAllConfirm}
        onOpenChange={setShowDownloadAllConfirm}
        title="Download All"
        description={`Download all ${downloadAllPhotos.length} photos/videos? They will download one by one to your device.`}
        confirmLabel="Download"
        onConfirm={executeDownloadAll}
      />
      </div>
      </PullToRefresh>
      );
      }