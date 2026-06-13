
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Camera, QrCode, Upload, Sparkles, Film, BarChart3, Users, Building, Heart } from 'lucide-react';
import LeadCaptureForm from '../components/forms/LeadCaptureForm';
import { base44 } from '@/api/base44Client';

const features = [
  {
    title: "Instant QR Code Access",
    description: "Guests scan a QR code and instantly access the event gallery. No app downloads, no sign-ups required.",
    icon: QrCode
  },
  {
    title: "Real-Time Photo Sharing",
    description: "Photos appear in the gallery immediately after upload. Everyone sees the latest memories as they happen.",
    icon: Camera
  },
  {
    title: "Unlimited Uploads",
    description: "No restrictions on photo uploads. Let your guests capture every special moment without limits.",
    icon: Upload
  },
  {
    title: "AI-Powered Features",
    description: "Smart photo tagging and organization using AI. Easily find selfies, group shots, and more.",
    icon: Sparkles
  },
  {
    title: "Video Support",
    description: "Share both photos and videos. Capture moving moments that photos alone can't convey.",
    icon: Film
  },
  {
    title: "Engagement Analytics",
    description: "Track photo uploads, likes, comments, and engagement metrics in real-time.",
    icon: BarChart3
  }
];

const useCases = [
  {
    title: "Weddings & Celebrations",
    description: "Let your guests become your photographers. Capture every angle of your special day with photos from all your loved ones.",
    icon: Heart
  },
  {
    title: "Corporate Events",
    description: "Boost engagement at conferences, team building, and company parties. Branded galleries with your logo and colors.",
    icon: Building
  },
  {
    title: "Private Parties",
    description: "Birthdays, anniversaries, graduations - any celebration becomes more memorable when everyone can share their perspective.",
    icon: Users
  }
];

export default function LandingPage() {
  
  const handleLogin = async () => {
      await base44.auth.redirectToLogin();
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900">Eventpix QR</span>
                <p className="text-xs text-gray-500 hidden sm:block">Scan. Smile. Capture. Share.</p>
              </div>
            </a>
          </div>
          <div className="lg:flex lg:flex-1 lg:justify-end">
             <Button onClick={handleLogin}>Log in / Sign up</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative isolate pt-14">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
        </div>
        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                  Scan. Smile. Capture. Share.
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  The easiest way to collect, share, and relive your event memories instantly with QR codes
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-10 flex items-center justify-center gap-x-6"
              >
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg" onClick={handleLogin}>Get Started for Free</Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-purple-600">How it Works</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything you need for an interactive event</p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Eventpix QR is designed to be simple for guests and powerful for hosts.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature, i) => (
                <motion.div 
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative pl-16"
                >
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.title}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>

       {/* Use Cases Section */}
        <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-purple-600">Perfect For Any Occasion</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Unforgettable Events, Captured Collaboratively</p>
                </div>
                <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {useCases.map((useCase, i) => (
                        <motion.div
                            key={useCase.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="flex flex-col items-start justify-between rounded-2xl bg-white p-8 ring-1 ring-gray-900/10"
                        >
                            <div className="relative">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 mb-4">
                                    <useCase.icon className="h-7 w-7 text-purple-600" aria-hidden="true" />
                                </div>
                                <h3 className="text-lg font-semibold leading-6 text-gray-900">{useCase.title}</h3>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{useCase.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>

      {/* Contact Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-xl px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center">Contact Sales</h2>
          <p className="mt-2 text-lg leading-8 text-gray-600 text-center">Have questions about our enterprise plans, pricing, or features? Get in touch!</p>
          <div className="mt-10">
            <LeadCaptureForm source="Landing Page Form" />
          </div>
        </div>
      </div>

    </div>
  );
}
