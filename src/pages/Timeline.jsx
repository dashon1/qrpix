import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, User, ArrowLeft, Music, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function Timeline() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);
  
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
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch(e => console.log("Audio play failed"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMuted]);

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
      // Filter out explicitly unapproved photos client-side (keep true and undefined)
      setPhotos(photoData.filter(p => p.is_approved !== false));
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

  return (
    <div className="h-screen w-screen bg-black text-white overflow-y-auto snap-y snap-mandatory">
      <audio 
        ref={audioRef} 
        src="https://cdn.pixabay.com/download/audio/2022/11/21/audio_a18db09a06.mp3" 
        loop 
        muted
      />

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
          onClick={() => setIsMuted(!isMuted)}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Music className="w-5 h-5" />}
        </Button>
      </div>
      
      <div className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
        <h1 className="font-bold text-xl">{event?.name}</h1>
      </div>

      {photos.map((photo, index) => (
        <div key={photo.id} className="h-screen w-screen flex items-center justify-center snap-start relative">
          <img
            src={photo.image_url}
            alt={photo.caption}
            className="w-full h-full object-contain select-none pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl mx-auto">
              {photo.dedication && (
                <p className="text-lg italic mb-2 text-yellow-300">"{photo.dedication}"</p>
              )}
              {photo.caption && (
                <p className="text-2xl font-medium mb-4">{photo.caption}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-lg">{photo.uploader_name}</span>
                    <p className="text-xs text-gray-300">{format(new Date(photo.created_date), "h:mm a")}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-current text-red-500" />
                    <span className="text-xl">{photo.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-xl">{photo.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}