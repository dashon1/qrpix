import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Calendar, X, ArrowLeft, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TVMode() {
  console.log("[TVMode] Component mounted");
  
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for intervals and mounted state
  const photoIntervalRef = useRef(null);
  const cycleIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadingTimeoutRef = useRef(null);
  
  // ✅ Extract eventId from URL - handle both hash and regular routing
  const getEventIdFromUrl = () => {
    // For hash routing: /#/TVMode?eventId=123
    if (window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      return hashParams.get("eventId") || hashParams.get("eventid");
    }
    // For regular routing: /TVMode?eventId=123
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("eventId") || urlParams.get("eventid");
  };
  
  const eventId = getEventIdFromUrl();
  
  console.log("[TVMode] Full URL:", window.location.href);
  console.log("[TVMode] Hash:", window.location.hash);
  console.log("[TVMode] Search:", window.location.search);
  console.log("[TVMode] Extracted eventId:", eventId);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Load photos
  const loadPhotos = useCallback(async () => {
    if (!eventId || !isMountedRef.current) return;
    
    try {
      const photoData = await base44.entities.Photo.filter({ 
        event_id: eventId
      }, "-created_date");
      
      if (isMountedRef.current) {
        // Filter out explicitly unapproved photos (keep true and undefined/null)
        setPhotos(photoData.filter(p => p.is_approved !== false));
      }
    } catch (err) {
      console.error("[TVMode] Photo load error:", err);
    }
  }, [eventId]);

  // ✅ Initial data load - NO NAVIGATION, just show error if missing eventId
  useEffect(() => {
    console.log("[TVMode] Initial load effect running");
    
    if (!eventId) {
      console.log("[TVMode] No eventId found");
      setError("No event ID in URL. Please open this link from a valid Event QR code.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Set loading timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading && !cancelled) {
        console.error("[TVMode] Loading timeout");
        setError("Loading timeout - please refresh the page");
        setLoading(false);
      }
    }, 10000);

    const loadData = async () => {
      try {
        console.log("[TVMode] Loading event:", eventId);
        
        // Use get() to fetch single event by ID - works for unauthenticated users
        const foundEvent = await base44.entities.Event.get(eventId);
        
        if (cancelled) return;
        
        if (!foundEvent) {
          console.log("[TVMode] Event not found");
          setError("Event not found. Please check the link and try again.");
          setLoading(false);
          return;
        }
        
        console.log("[TVMode] Event loaded:", foundEvent.name);
        setEvent(foundEvent);
        
        const photoData = await base44.entities.Photo.filter({ 
          event_id: eventId
        }, "-created_date");
        
        if (cancelled) return;
        
        // Filter out explicitly unapproved photos (keep true and undefined/null)
        const approvedPhotos = photoData.filter(p => p.is_approved !== false);
        console.log("[TVMode] Photos loaded:", photoData.length, "approved:", approvedPhotos.length);
        setPhotos(approvedPhotos);
        setLoading(false);
        
        // Clear loading timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
      } catch (err) {
        if (!cancelled) {
          console.error("[TVMode] Load error:", err);
          setError(err.message || "Failed to load event data");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [eventId]); // Only depend on eventId

  // Setup intervals after loading
  useEffect(() => {
    if (loading || error || !event || photos.length === 0) {
      return;
    }

    console.log("[TVMode] Setting up intervals");

    photoIntervalRef.current = setInterval(() => {
      loadPhotos();
    }, 10000);

    cycleIntervalRef.current = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    }, 8000);

    return cleanup;
  }, [loading, error, event, photos.length, loadPhotos, cleanup]);

  // Component unmount
  useEffect(() => {
    return () => {
      console.log("[TVMode] Component unmounting");
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // ✅ Navigation handlers - use React Router navigate instead of window.location
  const handleExit = useCallback(() => {
    console.log("[TVMode] Exiting to gallery");
    cleanup();
    navigate(createPageUrl(`EventGallery?eventId=${eventId}`));
  }, [eventId, cleanup, navigate]);

  const handleGoHome = useCallback(() => {
    console.log("[TVMode] Going home");
    cleanup();
    navigate(createPageUrl("Home"));
  }, [cleanup, navigate]);

  // ✅ Loading state - simple, no redirects
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
        <p className="text-lg font-semibold">Loading TV Mode...</p>
        <p className="text-sm text-gray-400 mt-2">Event ID: {eventId || "missing"}</p>
        <p className="text-xs text-gray-500 mt-4">If this takes more than 10 seconds, please refresh.</p>
      </div>
    );
  }

  // ✅ Error state - show message, no redirects
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-red-500">Unable to Load TV Mode</h2>
        <p className="text-gray-300 mb-6 text-center max-w-md">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} size="lg" className="bg-blue-600 hover:bg-blue-700">
            Refresh Page
          </Button>
          {eventId && (
            <Button onClick={handleExit} size="lg" className="bg-white text-black hover:bg-gray-200">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Gallery
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ✅ No event/photos state - show message, no redirects
  if (!event || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <h2 className="text-2xl font-bold mb-4">📸 No Photos Yet</h2>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          {event ? `"${event.name}" doesn't have any approved photos yet. Check back soon!` : "No photos to display."}
        </p>
        <div className="flex gap-4">
          <Button onClick={handleExit} variant="secondary" size="lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Gallery
          </Button>
          <Button onClick={handleGoHome} size="lg" className="bg-white text-black hover:bg-gray-200">
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentPhotoIndex];
  const totalLikes = photos.reduce((sum, p) => sum + (p.like_count || 0), 0);
  const recentPhotos = photos.slice(0, 3);

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      {/* Exit Buttons */}
      <div className="fixed top-0 left-0 right-0 z-[99999] p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-b from-black via-black/90 to-transparent">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExit}
            size="lg"
            className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-black font-bold shadow-2xl"
            style={{ minHeight: '56px' }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleGoHome}
            size="lg"
            className="flex-1 sm:flex-none bg-black/50 hover:bg-black/70 text-white border-2 border-white font-bold shadow-2xl"
            style={{ minHeight: '56px' }}
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>
        </div>
        
        <Button
          onClick={handleExit}
          size="lg"
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold shadow-2xl"
          style={{ minHeight: '56px', fontSize: '18px' }}
        >
          <X className="w-6 h-6 mr-2" />
          Exit TV Mode
        </Button>
      </div>

      {/* Header */}
      <div className="absolute left-0 right-0 z-40 p-4 md:p-6" style={{ top: '100px' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">{event.name}</h1>
          <p className="text-base md:text-lg text-white/80">Live Photo Feed</p>
          <div className="flex items-center gap-4 md:gap-6 mt-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 fill-current text-red-500" />
              <span className="text-xl font-bold">{totalLikes}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-xl font-bold">{photos.length} Photos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Photo */}
      <AnimatePresence mode="wait">
        {currentPhoto && (
          <motion.div
            key={currentPhoto.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentPhoto.is_video ? (
              <video
                key={currentPhoto.id}
                src={currentPhoto.image_url}
                autoPlay
                muted
                loop
                className="max-w-full max-h-full object-contain select-none"
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
              />
            ) : (
              <img
                src={currentPhoto.image_url}
                alt={currentPhoto.caption || ''}
                className="max-w-full max-h-full object-contain select-none pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-2xl">
              {currentPhoto.caption && (
                <p className="text-xl font-medium mb-2">{currentPhoto.caption}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-base text-white/80">📸 {currentPhoto.uploader_name || 'Guest'}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Heart className="w-5 h-5 fill-current text-red-500" />
                    <span>{currentPhoto.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-5 h-5" />
                    <span>{currentPhoto.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Sidebar */}
      <div className="hidden md:block absolute right-8 w-48 bg-black/60 backdrop-blur-md rounded-2xl p-4 z-30" style={{ top: '200px' }}>
        <h3 className="text-lg font-bold mb-3">Recent</h3>
        <div className="space-y-3">
          {recentPhotos.map((photo) => (
            <div key={photo.id} className="relative rounded-lg overflow-hidden">
              <img src={photo.image_url} alt="" className="w-full aspect-square object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs truncate">{photo.uploader_name || 'Guest'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-8 left-8 right-8 z-40">
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-white h-full rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "linear" }}
            key={currentPhotoIndex}
          />
        </div>
      </div>
    </div>
  );
}