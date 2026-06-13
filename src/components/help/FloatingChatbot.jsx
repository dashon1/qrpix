import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import HelpChatbot from './HelpChatbot';

export default function FloatingChatbot({ articles }) {
  const [isOpen, setIsOpen] = useState(false);
  const dragControls = useDragControls();

  return (
    <>
      {/* Floating Chat Bubble */}
      <div className="fixed z-50" style={{ bottom: "calc(2rem + env(safe-area-inset-bottom))", right: "2rem" }}>
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:scale-110 transition-transform"
                onClick={() => setIsOpen(true)}
              >
                <MessageSquare className="w-8 h-8" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed z-50 w-[90vw] max-w-sm"
            style={{ bottom: "calc(2rem + env(safe-area-inset-bottom))", right: "2rem" }}
          >
            <HelpChatbot articles={articles} onClose={() => setIsOpen(false)} dragControls={dragControls} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}