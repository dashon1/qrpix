import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, User } from 'lucide-react';

export default function UploadToast({ show, uploaderName, photoUrl, isVideo }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="New upload" 
                    className="w-16 h-16 rounded-lg object-cover ring-2 ring-white/50"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-lg" />
                </motion.div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  <p className="font-semibold text-sm">{uploaderName || 'Someone'}</p>
                </div>
                <p className="text-xs text-white/90">
                  just uploaded a {isVideo ? 'video' : 'photo'}! 🎉
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}