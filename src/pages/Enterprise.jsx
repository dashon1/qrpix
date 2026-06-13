import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Settings, Sparkles, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const features = [
  {
    icon: Settings,
    title: "Advanced Event Management",
    description: "Control every aspect of your event. Moderate photos, manage user roles, enable contest mode, and require photo approvals before they go live.",
    linkText: "Go to My Events",
    linkTo: "Home",
    hint: "Select an event from your dashboard, then click 'Manage' to access these controls."
  },
  {
    icon: BarChart3,
    title: "Engagement Analytics",
    description: "Dive deep into your event's performance with a dedicated analytics dashboard. Track top photos, contributors, and engagement over time.",
    linkText: "Go to My Events",
    linkTo: "Home",
    hint: "Select an event from your dashboard, then click 'Manage' → 'View Analytics'."
  },
  {
    icon: Sparkles,
    title: "AI-Powered Features",
    description: "Leverage AI to automatically tag and categorize photos (e.g., 'selfies', 'group shots'), making your galleries smarter and easier to navigate.",
    linkText: "Go to My Events",
    linkTo: "Home",
    hint: "AI features are automatically enabled for all events. Visit any event gallery to see them in action."
  },
  {
    icon: Film,
    title: "Live Engagement Tools",
    description: "Bring your event to life with a real-time Slideshow for big screens or a cinematic Timeline view that creates a scrolling story of your event.",
    linkText: "Browse Events",
    linkTo: "Browse",
    hint: "Open any event gallery and click 'Slideshow' or 'Timeline' in the header."
  },
];

export default function Enterprise() {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
            QRPix for Business & Events
          </h1>
          <p className="text-lg text-gray-600">
            Powerful features to manage, analyze, and elevate your events.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            All these features are integrated into your event workflow. Click below to get started.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="h-full hover:shadow-xl hover:border-purple-300 transition-all duration-300">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <p className="text-sm text-gray-500 italic mb-6">💡 {feature.hint}</p>
                  <Link to={createPageUrl(feature.linkTo)}>
                    <Button variant="outline" className="w-full">
                      {feature.linkText} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <div className="text-center mt-16">
            <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
            <Link to={createPageUrl("CreateEvent")}>
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg">
                Create Your First Event
              </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}