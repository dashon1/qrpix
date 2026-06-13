import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Camera, QrCode, Upload, Sparkles, Users, MessageSquare, Settings, CheckCircle, Heart, Building2, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";

const HOST_ONBOARDING = [
  {
    icon: PartyPopper,
    title: "Welcome to Eventpix QR!",
    description: "Let's get you started as an event host. You'll learn how to create amazing events where guests can share photos instantly using QR codes.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Camera,
    title: "1. Create Your Event",
    description: "Click 'Create Event' to set up your first event. Add a name, description, cover image, and choose your theme. You can enable features like ticketing, guestbook, and video uploads.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: QrCode,
    title: "2. Share Your QR Code",
    description: "Once created, you'll get a unique QR code. Display it at your venue on posters, table cards, or a TV screen. Guests scan it with their phones - no app download needed!",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Settings,
    title: "3. Manage Your Event",
    description: "Use the 'Manage Event' page to moderate photos, add co-hosts, enable AI features, view analytics, and download all photos. You have full control!",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Sparkles,
    title: "4. AI-Powered Magic",
    description: "Enable AI tagging to automatically sort photos into categories like 'selfies' and 'group shots'. Turn on contest mode to let guests vote for their favorite photos!",
    color: "from-purple-500 to-indigo-500"
  },
  {
    icon: MessageSquare,
    title: "Need Help? Ask Our AI!",
    description: "See the purple chat bubble at the bottom right? That's your AI assistant! Ask any question about features, settings, or troubleshooting. It's available 24/7.",
    color: "from-pink-500 to-rose-500"
  }
];

const GUEST_ONBOARDING = [
  {
    icon: QrCode,
    title: "Welcome, Guest!",
    description: "You've been invited to an event! Here's how to participate and share your memories.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: QrCode,
    title: "1. Scan the QR Code",
    description: "At the event venue, look for QR code posters. Open your phone's camera app and point it at the QR code. Tap the notification to open the event gallery.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Upload,
    title: "2. Upload Photos & Videos",
    description: "Take photos or videos at the event, then upload them to the shared gallery. Add captions and dedications to make them extra special!",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Heart,
    title: "3. Engage with Content",
    description: "Like photos, leave comments, add emoji reactions, and vote in photo contests. Interact with other guests' photos to build the event vibe!",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: Sparkles,
    title: "4. Explore Event Features",
    description: "Check out the Timeline view, play the Slideshow, sign the Guestbook, and download your favorite photos. So many ways to enjoy the event!",
    color: "from-purple-500 to-indigo-500"
  },
  {
    icon: MessageSquare,
    title: "Questions? Chat with AI!",
    description: "Click the purple chat icon at the bottom right to ask our AI assistant anything. From 'How do I upload a video?' to 'Where's the guestbook?' - we've got answers!",
    color: "from-orange-500 to-yellow-500"
  }
];

const TEAM_ONBOARDING = [
  {
    icon: Users,
    title: "Welcome to the Team!",
    description: "You've been added as a co-host! You have full access to manage this event alongside the main host.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Settings,
    title: "Co-Host Permissions",
    description: "As a co-host, you can: moderate photos, manage event settings, view analytics, add other co-hosts, and access all event controls. You have the same powers as the host!",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Camera,
    title: "Moderate Content",
    description: "Go to 'Manage Event' to review and delete photos if needed. If 'Require Approval' is enabled, you'll need to approve photos before they appear in the gallery.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Building2,
    title: "Team Collaboration",
    description: "Multiple co-hosts can manage the same event simultaneously. Perfect for large events with multiple organizers or photographers!",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: Sparkles,
    title: "Advanced Features",
    description: "Enable AI tagging, contest mode, ticketing, print shop, and more. Customize the event experience to match your vision.",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: MessageSquare,
    title: "AI Assistant at Your Service",
    description: "The purple chat bubble is your 24/7 helper. Ask about any feature, get tips on best practices, or troubleshoot issues. We're here to help!",
    color: "from-pink-500 to-rose-500"
  }
];

export default function OnboardingDialog({ open, onOpenChange, mode = 'host' }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = mode === 'host' ? HOST_ONBOARDING : mode === 'guest' ? GUEST_ONBOARDING : TEAM_ONBOARDING;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark onboarding as completed
      localStorage.setItem(`onboarding_${mode}_completed`, 'true');
      onOpenChange(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const skipOnboarding = () => {
    localStorage.setItem(`onboarding_${mode}_completed`, 'true');
    onOpenChange(false);
  };

  const { icon: Icon, title, description, color } = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'host' && '🎉 Host Onboarding'}
            {mode === 'guest' && '📸 Guest Guide'}
            {mode === 'team' && '👥 Team Member Guide'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`bg-gradient-to-br ${color} p-1`}>
                <CardContent className="bg-white rounded-lg p-8">
                  <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">{title}</h3>
                  <p className="text-gray-700 text-lg leading-relaxed text-center">{description}</p>
                </CardContent>
              </Card>

              {/* Progress Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep 
                        ? 'w-8 bg-purple-600' 
                        : index < currentStep 
                          ? 'w-2 bg-green-500' 
                          : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={skipOnboarding} className="text-gray-500">
              Skip
            </Button>
            <Button onClick={nextStep} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}