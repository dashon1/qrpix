
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Star, Loader2, Clock, Zap, Crown, Gift } from "lucide-react";
import { motion } from "framer-motion";
import LeadCaptureDialog from '../components/forms/LeadCaptureDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';

const limitedTimeTrial = {
  name: "Limited Time Offer",
  price: "4.99",
  originalPrice: "15.00",
  billing: "/ month special",
  description: "🔥 Hurry before it's gone! Get started with Eventpix QR at an incredible price.",
  features: [
    "2 Credits (1 Event)",
    "500 photos per event",
    "25 videos per event",
    "QR Code Sharing",
    "Standard Gallery View",
    "AI Smart Filters",
    "Credits valid for 90 days"
  ],
  highlight: "⚡ HURRY - LIMITED TIME!",
  popular: true,
  cta: "Grab This Deal Now",
  source: "Limited Time Offer",
  priceId: "price_1TKXBL0xw5o9mCvnisbinvuD"
};

const monthlyPlans = [
  {
    name: "Free Trial",
    price: "0",
    billing: "14 days",
    description: "Try Eventpix QR risk-free with no credit card required.",
    features: [
      "2 Credits (1 Event)",
      "150 photos per event",
      "10 videos per event",
      "QR Code Sharing",
      "Standard Gallery View",
      "AI Smart Filters",
      "Credits valid for 14 days"
    ],
    popular: false,
    cta: "Start Free Trial",
    source: "Free Trial",
    priceId: null,
    isFree: true

  },
  {
    name: "Starter",
    price: "15",
    billing: "/ month",
    description: "Essential features for small personal events.",
    features: [
      "10 Credits per Month",
      "2 credits = 1 event (5 events/month)",
      "350 photos per event",
      "25 videos per event",
      "QR Code Sharing",
      "Standard Gallery View",
      "AI Smart Filters",
      "Credits expire in 30 days - no rollover"
    ],
    popular: false,
    cta: "Choose Starter",
    source: "Starter Plan",
    priceId: "price_1TKXBL0xw5o9mCvn9IZknTBn"
  },
  {
    name: "Pro",
    price: "29",
    billing: "/ month",
    description: "Advanced features for professionals hosting frequent events.",
    features: [
      "20 Credits per Month",
      "2 credits = 1 event (10 events/month)",
      "500 photos per event",
      "50 videos per event",
      "Everything in Starter",
      "Remove Watermarks",
      "Timeline & Slideshow Views",
      "Custom Event Themes",
      "Priority Support",
      "Share Credits with Others",
      "Credits expire in 30 days - no rollover"
    ],
    popular: true,
    cta: "Choose Pro",
    source: "Pro Plan",
    priceId: "price_1TKXBM0xw5o9mCvnwcgiQd0U"
  },
  {
    name: "Business",
    price: "99",
    billing: "/ month",
    description: "Complete solution with custom branding for agencies.",
    features: [
      "80 Credits per Month",
      "2 credits = 1 event (40 events/month)",
      "1000 photos per event",
      "75 videos per event",
      "Everything in Pro",
      "Custom Branding & Logo",
      "Advanced Moderation Tools",
      "Dedicated Account Manager",
      "Multi-User Management",
      "Share Credits with Team",
      "Credits expire in 30 days - no rollover"
    ],
    popular: false,
    cta: "Choose Business",
    source: "Business Plan",
    priceId: "price_1TKXBM0xw5o9mCvnHonoz21d"
  },
];

const creditPacks = [
  {
    name: "Starter Pack",
    price: "17",
    credits: "10",
    description: "Perfect for a few small gatherings or personal celebrations.",
    features: [
      "2 credits = 1 event (5 events total)",
      "350 photos per event",
      "25 videos per event",
      "Credits expire in 90 days",
      "All standard features included",
      "13% premium vs monthly"
    ],
    cta: "Purchase Credits",
    source: "Starter Credit Pack",
    popular: false,
    priceId: "price_1TKXBM0xw5o9mCvnhu8rCece"
  },
  {
    name: "Value Pack",
    price: "65",
    credits: "40",
    description: "Best value for frequent event hosts - save big on per-event costs!",
    features: [
      "2 credits = 1 event (20 events total)",
      "500 photos per event",
      "50 videos per event",
      "Credits expire in 90 days",
      "12% premium vs monthly"
    ],
    cta: "Purchase Credits",
    source: "Value Credit Pack",
    popular: true,
    priceId: "price_1TKXBN0xw5o9mCvndfXAIpCl"
  },
  {
    name: "Pro Pack",
    price: "140",
    credits: "100",
    description: "The ultimate bundle for power users managing multiple large events.",
    features: [
      "2 credits = 1 event (50 events total)",
      "1000 photos per event",
      "75 videos per event",
      "Credits expire in 90 days",
      "13% premium vs monthly"
    ],
    cta: "Purchase Credits",
    source: "Pro Credit Pack",
    popular: false,
    priceId: "price_1TKXBN0xw5o9mCvn5tMzNWlo"
  }
];

export default function Pricing() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', source: '' });
  const [loadingPack, setLoadingPack] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingTrial, setLoadingTrial] = useState(false);

  const handleContact = (plan) => {
    setDialogConfig({
      title: `Inquiry for ${plan.name}`,
      description: "Please fill out the form below. Our team will contact you shortly to complete your setup.",
      source: plan.source,
    });
    setDialogOpen(true);
  };
  
  const handleTrialSignup = async () => {
    setLoadingTrial(true);
    try {
      console.log('Starting trial signup with priceId:', limitedTimeTrial.priceId);
      const response = await base44.functions.invoke('createStripeCheckout', { 
        priceId: limitedTimeTrial.priceId,
        credits: 2,
        packName: 'Limited Time Offer'
      });
      
      console.log('Stripe checkout response:', response);
      
      if (response.data?.url) {
        console.log('Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('No checkout URL in response:', response);
        alert("Could not initiate purchase. Server returned no URL. Please contact support.");
      }
    } catch(error) {
      console.error("Stripe checkout error (trial signup):", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Could not initiate purchase. Please check console for details or contact support. Error: " + error.message);
    } finally {
      setLoadingTrial(false);
    }
  };

  const handlePurchase = async (pack) => {
    setLoadingPack(pack.name);
    try {
      console.log('Starting purchase for pack:', pack.name, 'with priceId:', pack.priceId);
      const response = await base44.functions.invoke('createStripeCheckout', { 
        packName: pack.name,
        priceId: pack.priceId,
        credits: parseInt(pack.credits)
      });
      
      console.log('Stripe checkout response:', response);
      
      if (response.data?.url) {
        console.log('Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('No checkout URL in response:', response);
        alert("Could not initiate purchase. Server returned no URL. Please contact support.");
      }
    } catch(error) {
      console.error("Stripe checkout error (pack purchase):", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Could not initiate purchase. Please check console for details or contact support. Error: " + error.message);
    } finally {
      setLoadingPack(null);
    }
  };

  const handleSubscribe = async (plan) => {
    if (plan.isFree) {
      // For free trial, just redirect to signup
      await base44.auth.redirectToLogin();
      return;
    }
    
    if (!plan.priceId) {
      alert("This plan is not yet configured. Please contact support.");
      return;
    }
    
    setLoadingPlan(plan.name);
    try {
      let monthlyCredits = 0;
      if (plan.name === "Starter") monthlyCredits = 10;
      if (plan.name === "Pro") monthlyCredits = 20;
      if (plan.name === "Business") monthlyCredits = 80;
      
      console.log('Starting subscription for plan:', plan.name, 'with priceId:', plan.priceId);
      const response = await base44.functions.invoke('createStripeCheckout', { 
        priceId: plan.priceId,
        planName: plan.name.toLowerCase(),
        monthlyCredits: monthlyCredits
      });
      
      console.log('Stripe checkout response:', response);
      
      if (response.data?.url) {
        console.log('Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('No checkout URL in response:', response);
        alert("Could not initiate subscription. Server returned no URL. Please contact support.");
      }
    } catch(error) {
      console.error("Stripe checkout error (subscription):", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Could not initiate subscription. Please check console for details or contact support. Error: " + error.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Choose Your Perfect Plan
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              All plans use a credit-based system: <strong>2 credits = 1 event</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Monthly plans: Credits expire in 30 days (no rollover)</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span>Pay-as-you-go: Credits expire in 90 days</span>
              </div>
            </div>
          </motion.div>

          {/* Limited Time Offer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12"
          >
            <Card className="border-4 border-orange-400 shadow-2xl bg-gradient-to-br from-orange-50 to-pink-50 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-orange-500 text-white px-6 py-2 text-sm font-bold transform rotate-12 translate-x-8 -translate-y-2">
                {limitedTimeTrial.highlight}
              </div>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <Zap className="w-12 h-12 text-orange-500 animate-pulse" />
                </div>
                <CardTitle className="text-3xl mb-2">{limitedTimeTrial.name}</CardTitle>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-gray-400 line-through text-2xl">${limitedTimeTrial.originalPrice}</span>
                  <span className="text-5xl font-bold text-orange-600">${limitedTimeTrial.price}</span>
                  <span className="text-gray-600">{limitedTimeTrial.billing}</span>
                </div>
                <CardDescription className="text-lg pt-2">{limitedTimeTrial.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {limitedTimeTrial.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleTrialSignup}
                  disabled={loadingTrial}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-lg h-14 shadow-lg"
                >
                  {loadingTrial ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                  ) : (
                    <>{limitedTimeTrial.cta} - Save ${(parseFloat(limitedTimeTrial.originalPrice) - parseFloat(limitedTimeTrial.price)).toFixed(2)}!</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto mb-8">
              <TabsTrigger value="monthly">Monthly Plans</TabsTrigger>
              <TabsTrigger value="credits">Pay As You Go</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {monthlyPlans.map((plan, index) => (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`h-full flex flex-col ${plan.popular ? 'border-2 border-purple-500 shadow-2xl' : 'hover:shadow-xl'} transition-all duration-300`}>
                      {plan.popular && (
                        <div className="bg-purple-500 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 rounded-t-lg flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Most Popular
                        </div>
                      )}
                      <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div>
                          <span className="text-4xl font-bold">${plan.price}</span>
                          <span className="text-gray-500 ml-1">{plan.billing}</span>
                        </div>
                        <CardDescription className="h-16 pt-2 text-sm">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <ul className="space-y-2 mb-6">
                          {plan.features.map(feature => (
                            <li key={feature} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-600 text-xs">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handleSubscribe(plan)}
                          size="lg"
                          disabled={loadingPlan === plan.name}
                          className={`w-full ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''} ${plan.isFree ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          {loadingPlan === plan.name ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                          ) : (
                            plan.cta
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="credits" className="mt-8">
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {creditPacks.map((pack, index) => (
                  <motion.div
                    key={pack.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`h-full flex flex-col ${pack.popular ? 'border-2 border-purple-500 shadow-2xl' : 'hover:shadow-xl'} transition-all duration-300`}>
                       {pack.popular && (
                        <div className="bg-purple-500 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 rounded-t-lg flex items-center justify-center gap-2">
                          <Star className="w-4 h-4" />
                          Best Value
                        </div>
                      )}
                      <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{pack.name}</CardTitle>
                         <div>
                          <span className="text-4xl font-bold">${pack.price}</span>
                          <span className="text-2xl text-purple-600 font-semibold block mt-2">{pack.credits} Credits</span>
                        </div>
                        <CardDescription className="h-12 pt-2">{pack.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <ul className="space-y-3 mb-8">
                          {pack.features.map(feature => (
                            <li key={feature} className="flex items-start gap-3">
                              <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-600 text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handlePurchase(pack)}
                          size="lg"
                          disabled={loadingPack === pack.name}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          {loadingPack === pack.name ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                          ) : (
                            pack.cta
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Enterprise/Custom Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <Card className="bg-gradient-to-br from-purple-900 to-pink-900 text-white border-0 shadow-2xl">
              <CardContent className="p-12">
                <Crown className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
                <h2 className="text-3xl font-bold mb-4">Enterprise & White Label Solutions</h2>
                <p className="text-xl text-purple-100 mb-6 max-w-2xl mx-auto">
                  Need unlimited events, white labeling, or custom development? Our Enterprise plans offer complete platform customization, dedicated infrastructure, and your own branded solution.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mb-8 text-left">
                  <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-2">🎨 White Labeling</h3>
                    <p className="text-sm text-purple-200">Complete brand customization with your logo, colors, and domain</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-2">🚀 Unlimited Scale</h3>
                    <p className="text-sm text-purple-200">No limits on events, photos, videos, or users</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-2">🛠️ Custom Features</h3>
                    <p className="text-sm text-purple-200">Tailored development to match your exact business needs</p>
                  </div>
                </div>
                <p className="text-lg text-purple-200 mb-8">
                  Perfect for: Event agencies, corporate teams, venues, franchises, and resellers
                </p>
                <Button
                  onClick={() => {
                    setDialogConfig({
                      title: "Enterprise & White Label Inquiry",
                      description: "Tell us about your needs and we'll create a custom enterprise solution perfect for your business.",
                      source: "Enterprise Inquiry"
                    });
                    setDialogOpen(true);
                  }}
                  size="lg"
                  variant="secondary"
                  className="bg-white text-purple-900 hover:bg-gray-100 font-bold text-lg px-8"
                >
                  Contact Us for Enterprise Pricing
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <LeadCaptureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        source={dialogConfig.source}
      />
    </>
  );
}
