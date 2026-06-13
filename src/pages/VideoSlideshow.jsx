import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, User, ArrowLeft, Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VideoSlideshow() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

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
    loadData();
    const videoInterval = setInterval(loadVideos, 10000);
    return () => clearInterval(videoInterval);
  }, []);

  const loadData = async () => {
    const foundEvent = await base44.entities.Event.get(eventId);
    setEvent(foundEvent);
    await loadVideos();
    setLoading(false);
  };

  const loadVideos = async () => {
    const photoData = await base44.entities.Photo.filter({ 
      event_id: eventId
    }, "-created_date");
    // Filter client-side to get approved videos only
    setVideos(photoData.filter(p => p.is_approved !== false && p.is_video === true));
  };

  const handleVideoEnd = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!event || videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No videos available</h2>
          <Button onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}>
            Back to Gallery
          </Button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

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
          onClick={togglePlayPause}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleSkip}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-50">
        <div className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
          <h1 className="text-white font-bold text-xl">{event.name} - Videos</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <video
            ref={videoRef}
            src={currentVideo.image_url}
            autoPlay
            onEnded={handleVideoEnd}
            className="max-w-full max-h-full object-contain"
            controls={false}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white pointer-events-none">
            <div className="max-w-4xl mx-auto">
              {currentVideo.caption && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-medium mb-4"
                >
                  {currentVideo.caption}
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
                  <span className="text-lg">{currentVideo.uploader_name}</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-current" />
                    <span className="text-xl">{currentVideo.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-xl">{currentVideo.comment_count || 0}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        {videos.map((_, index) => (
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