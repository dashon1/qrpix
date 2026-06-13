import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, MapPin, Calendar, Ticket, Users, Camera, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function EventIntroSlideshow({ event, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // Build slides based on event data
  const slides = [
    {
      icon: Info,
      title: `Welcome to ${event.name}!`,
      content: event.description || 'Get ready for an amazing experience.',
      color: 'from-purple-500 to-pink-500'
    },
    ...(event.start_date || event.expiration_date ? [{
      icon: Calendar,
      title: 'Event Schedule',
      content: `${event.start_date ? `Starts: ${format(new Date(event.start_date), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}` : ''}${event.start_date && event.expiration_date ? '\n\n' : ''}${event.expiration_date ? `Ends: ${format(new Date(event.expiration_date), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}` : ''}`,
      color: 'from-blue-500 to-cyan-500'
    }] : []),
    ...(event.location_address ? [{
      icon: MapPin,
      title: 'Event Location',
      content: event.location_address,
      color: 'from-green-500 to-emerald-500'
    }] : []),
    ...(event.is_paid_event ? [{
      icon: Ticket,
      title: event.ticket_price === 0 ? 'Free Registration' : 'Ticketing Information',
      content: event.ticket_price === 0 
        ? 'This is a free event! Register to secure your spot and receive your ticket via email.' 
        : `Tickets: $${event.ticket_price} per person${event.max_tickets ? `\nLimited to ${event.max_tickets} tickets` : ''}${event.ticket_description ? `\n\n${event.ticket_description}` : ''}`,
      color: 'from-yellow-500 to-orange-500'
    }] : []),
    {
      icon: Camera,
      title: 'Share Your Moments',
      content: 'Upload photos and videos throughout the event. Like, comment, and engage with other guests\' content. All your memories in one place!',
      color: 'from-pink-500 to-rose-500'
    },
    ...(event.num_tables && event.people_per_table ? [{
      icon: Users,
      title: 'Seating Information',
      content: `This event has ${event.num_tables} tables with ${event.people_per_table} seats each. Check your ticket for your table and seat assignment.`,
      color: 'from-indigo-500 to-purple-500'
    }] : [])
  ];

  useEffect(() => {
    if (!autoPlayEnabled) return;

    const timer = setTimeout(() => {
      if (currentSlide < slides.length - 1) {
        setCurrentSlide(prev => prev + 1);
      } else {
        // Slideshow finished, close after a brief delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }, 4000); // 4 seconds per slide

    return () => clearTimeout(timer);
  }, [currentSlide, autoPlayEnabled, slides.length, onClose]);

  const handleNext = () => {
    setAutoPlayEnabled(false);
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const currentSlideData = slides[currentSlide];
  const Icon = currentSlideData.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] bg-black/95 flex items-center justify-center p-4 overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* MASSIVE Close Buttons - Mobile First */}
      <div className="absolute top-0 left-0 right-0 z-[1000000] p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <Button
          onClick={handleSkip}
          size="lg"
          className="bg-white text-black hover:bg-gray-200 font-bold text-lg px-6 py-6 shadow-2xl touch-manipulation"
          style={{ minHeight: '60px', minWidth: '140px' }}
        >
          Skip Intro
        </Button>
        
        <Button
          onClick={handleSkip}
          size="lg"
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 shadow-2xl touch-manipulation"
          style={{ minHeight: '60px', minWidth: '60px' }}
        >
          <X className="w-8 h-8" />
        </Button>
      </div>

      <div className="max-w-4xl w-full relative mt-20">
        {/* Main Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={`w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 md:mb-8 rounded-full bg-gradient-to-br ${currentSlideData.color} flex items-center justify-center shadow-2xl`}
            >
              <Icon className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-4"
            >
              {currentSlideData.title}
            </motion.h1>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto whitespace-pre-line leading-relaxed px-4"
            >
              {currentSlideData.content}
            </motion.div>

            {/* Event Logo/Cover if available */}
            {currentSlide === 0 && event.logo_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 md:mt-8"
              >
                <img
                  src={event.logo_url}
                  alt={event.name}
                  className="w-24 h-24 md:w-32 md:h-32 mx-auto object-contain rounded-lg"
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mt-8 md:mt-12">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentSlide
                  ? 'w-12 bg-white'
                  : index < currentSlide
                    ? 'w-8 bg-green-500'
                    : 'w-8 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Navigation - Large Touch-Friendly Buttons */}
        <div className="flex flex-col items-center gap-4 mt-6 md:mt-8">
          <Button
            onClick={handleNext}
            size="lg"
            className={`gap-2 bg-gradient-to-r ${currentSlideData.color} hover:opacity-90 text-white px-8 py-6 text-lg shadow-2xl touch-manipulation`}
            style={{ minHeight: '60px', minWidth: '200px' }}
          >
            {currentSlide < slides.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-6 h-6" />
              </>
            ) : (
              <>
                Let's Go!
                <ChevronRight className="w-6 h-6" />
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 text-base px-6 py-4 touch-manipulation"
            style={{ minHeight: '50px' }}
          >
            Skip this introduction
          </Button>
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4 md:mt-6 text-gray-400 text-sm">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </motion.div>
  );
}