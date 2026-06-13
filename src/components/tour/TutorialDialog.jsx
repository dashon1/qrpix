import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Camera, QrCode, Upload, Sparkles, Award, BarChart3, Film } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const TUTORIAL_STEPS = [
  {
    icon: Camera,
    title: "1. Create Your Event",
    description: "Start by creating an event. Give it a name, choose a theme color, and set an expiration date. Your event is the central hub for all shared photos.",
  },
  {
    icon: QrCode,
    title: "2. Share with a QR Code",
    description: "Once your event is created, you'll get a unique QR code. Guests can scan this code with their phones to instantly join the private gallery—no app download required!",
  },
  {
    icon: Upload,
    title: "3. Capture & Upload",
    description: "Everyone at the event can take photos or upload from their phone's gallery. Add captions and dedications to make memories even more special.",
  },
  {
    icon: Sparkles,
    title: "4. AI Magic & Fun",
    description: "Enable AI to automatically tag photos, creating smart filters for 'selfies' or 'group shots'. Use Contest Mode or our Leaderboard to gamify your event!",
  },
  {
    icon: Film,
    title: "5. Relive the Moments",
    description: "View all photos in a beautiful gallery, a cinematic Timeline, or a live Slideshow on a big screen. It's the perfect way to see your event unfold in real-time.",
  },
  {
    icon: BarChart3,
    title: "6. Get Insights",
    description: "As a host, you get access to an Analytics dashboard. See which photos are most popular, who the top contributors are, and track engagement over time.",
  },
];

export default function TutorialDialog({ open, onOpenChange }) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const { icon: Icon, title, description } = TUTORIAL_STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to QRPix!</DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className="text-gray-600">{description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Prev
            </Button>
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)} className="bg-green-600 hover:bg-green-700">
                Finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}