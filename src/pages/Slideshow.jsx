import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, User, ArrowLeft, Play, Pause, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Slider } from "@/components/ui/slider";

export default function Slideshow() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(5); // Speed in seconds (1-10)
  const [showSpeedControl, setShowSpeedControl] = useState(false);

  // Extract eventId from URL - handle both hash and regular routing
  const getEventIdFromUrl = () => {
    if (window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      return hashParams.get("eventId") || hashParams.get("eventid");
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("eventId") || urlParams.get("eventid");
  };
  
  const eventId = getEventIdFromUrl();

  useEffect(() => {
    if (eventId) {
      loadData();
      const photoInterval = setInterval(loadPhotos, 10000);
      return () => clearInterval(photoInterval);
    }
  }, [eventId]);

  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, speed * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, photos.length, currentIndex, speed]);

  const loadData = async () => {
    try {
      const foundEvent = await base44.entities.Event.get(eventId);
      setEvent(foundEvent);
      await loadPhotos();
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const loadPhotos = async () => {
    try {
      const photoData = await base44.entities.Photo.filter({ 
        event_id: eventId
      }, "-created_date");
      // Filter out unapproved and videos client-side (keep is_approved: true or undefined)
      setPhotos(photoData.filter(p => p.is_approved !== false && !p.is_video));
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!event || photos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No photos available</h2>
          <Button onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}>
            Back to Gallery
          </Button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowSpeedControl(!showSpeedControl)}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <Gauge className="w-5 h-5" />
        </Button>
      </div>

      {showSpeedControl && (
        <div className="absolute top-20 left-4 z-50 bg-black/80 backdrop-blur-sm p-4 rounded-lg w-64">
          <div className="text-white mb-2 text-sm font-medium">
            Speed: {speed}s per photo
          </div>
          <Slider
            value={[speed]}
            onValueChange={(value) => setSpeed(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Fast (1s)</span>
            <span>Slow (10s)</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-50">
        <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
          <h1 className="text-white font-bold text-xl">{event.name}</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={currentPhoto.image_url}
            alt={currentPhoto.caption}
            className="w-full h-full object-contain select-none pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="max-w-4xl mx-auto">
              {currentPhoto.caption && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-medium mb-4"
                >
                  {currentPhoto.caption}
                </motion.p>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-lg">{currentPhoto.uploader_name}</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-current" />
                    <span className="text-xl">{currentPhoto.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-xl">{currentPhoto.comment_count || 0}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        {photos.map((_, index) => (
          <div
            key={index}
            className={`h-1 transition-all duration-300 rounded-full ${
              index === currentIndex
                ? "w-8 bg-white"
                : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}