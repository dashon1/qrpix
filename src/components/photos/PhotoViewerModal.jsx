import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PhotoViewerModal({ photo, photos, open, onOpenChange, onNavigate, allowDownloads = false }) {
  const currentIndex = photos.findIndex(p => p.id === photo?.id);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < photos.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onNavigate(photos[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(photos[currentIndex + 1]);
    }
  };

  const handleDownload = () => {
    if (!allowDownloads) {
      alert("🔒 Downloads are disabled for this event.\n\nThe event host has restricted photo downloads. Contact the host if you need access.");
      return;
    }
    const link = document.createElement('a');
    link.href = photo.image_url;
    link.download = `QRPix_${photo.id}.${photo.is_video ? 'mp4' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black border-0">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>

          {canGoPrev && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {canGoNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center p-4"
              style={{ maxWidth: '90vw', maxHeight: '80vh' }}
            >
              {photo.is_video ? (
                <video
                  src={photo.image_url}
                  controls
                  controlsList="nodownload"
                  autoPlay
                  className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <img
                  src={photo.image_url}
                  alt={photo.caption}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg select-none pointer-events-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pointer-events-none">
            <div className="max-w-4xl mx-auto">
              {photo.dedication && (
                <p className="text-yellow-300 italic mb-2">"{photo.dedication}"</p>
              )}
              {photo.caption && (
                <p className="text-white text-lg mb-3">{photo.caption}</p>
              )}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{photo.uploader_name}</span>
                </div>
                <div className="flex items-center gap-4 pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    <span>{photo.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    <span>{photo.comment_count || 0}</span>
                  </div>
                  {allowDownloads && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      className="text-white hover:bg-white/20"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}