
import React, { useState, useEffect, useRef } from "react";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ArrowLeft, Palette, Mic, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Hint } from "../components/ui/Hint";
import { Checkbox } from "@/components/ui/checkbox";
import EventTemplateSelector from "../components/events/EventTemplateSelector";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const PRESET_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#06B6D4"];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location_address: "",
    theme_color: "#8B5CF6",
    event_template: "custom",
    start_date: "", // New field added
    expiration_date: "",
    ticket_sale_start_date: "",
    allow_video_upload: false,
    allow_post_event_uploads: false,
    guestbook_enabled: true,
    watermark_enabled: false,
    watermark_text: "Eventpix QR",
    is_paid_event: false,
    ticket_price: "",
    ticket_description: "",
    max_tickets: ""
  });
  const [coverFile, setCoverFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListeningName, setIsListeningName] = useState(false);
  const [isListeningDesc, setIsListeningDesc] = useState(false);
  const [isListeningLocation, setIsListeningLocation] = useState(false);
  const nameRecognitionRef = useRef(null);
  const descRecognitionRef = useRef(null);
  const locationRecognitionRef = useRef(null);

  // New state declarations for AI cover generation
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const setupRecognition = (fieldSetter, listeningSetter) => {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onstart = () => listeningSetter(true);
        recognition.onend = () => listeningSetter(false);
        recognition.onerror = (e) => { console.error("Speech recognition error:", e.error); listeningSetter(false); };
        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          fieldSetter(transcript);
        };
        return recognition;
      };
      nameRecognitionRef.current = setupRecognition((transcript) => setFormData(prev => ({ ...prev, name: transcript })), setIsListeningName);
      descRecognitionRef.current = setupRecognition((transcript) => setFormData(prev => ({ ...prev, description: transcript })), setIsListeningDesc);
      locationRecognitionRef.current = setupRecognition((transcript) => setFormData(prev => ({ ...prev, location_address: transcript })), setIsListeningLocation);
    }
  }, []);

  // New useEffect to load user
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleListen = (field) => {
    const isName = field === 'name';
    const isDesc = field === 'description';
    const isLocation = field === 'location';
    
    const recognition = isName ? nameRecognitionRef.current : (isDesc ? descRecognitionRef.current : locationRecognitionRef.current);
    const isListening = isName ? isListeningName : (isDesc ? isListeningDesc : isLocation ? isListeningLocation : false);
    
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
    } else {
      if (isName) { setFormData(prev => ({ ...prev, name: '' })); }
      else if (isDesc) { setFormData(prev => ({ ...prev, description: '' })); }
      else if (isLocation) { setFormData(prev => ({ ...prev, location_address: '' })); }
      recognition.start();
    }
  };

  // New function for AI cover image generation
  const handleGenerateCoverImage = async () => {
    if (!formData.name) {
      alert("Please enter an event name first to generate a cover image.");
      return;
    }

    setGeneratingCover(true);
    try {
      const prompt = `Create a beautiful, professional event cover image for an event called "${formData.name}". ${formData.description ? `The event is about: ${formData.description}.` : ''} Style: Modern, vibrant, celebratory, high-quality photography style. Include abstract decorative elements that match a ${formData.event_template} theme. No text or words in the image.`;
      
      const result = await base44.integrations.Core.GenerateImage({ prompt });
      
      if (result.url) {
        setGeneratedCoverUrl(result.url);
        alert("Cover image generated successfully! You can now create your event.");
      }
    } catch (error) {
      console.error("Error generating cover image:", error);
      alert("Failed to generate cover image. Please try again or upload your own.");
    }
    setGeneratingCover(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      const hasCredits = (user.credits || 0) >= 2;
      
      if (!hasCredits) {
        alert("You need at least 2 credits to create an event. Please purchase credits or upgrade your plan.");
        navigate(createPageUrl("Pricing"));
        return;
      }

      const myEvents = await base44.entities.Event.filter({ host_email: user.email, is_active: true });

      for (const event of myEvents) {
        const photos = await base44.entities.Photo.filter({ event_id: event.id });
        const photoCount = photos.filter(p => !p.is_video).length;
        const videoCount = photos.filter(p => p.is_video).length;
        
        if (photoCount >= 350) {
          alert(`Event "${event.name}" has reached the photo limit (350). Please upgrade or create a new event.`);
          return;
        }
        if (videoCount >= 50) {
          alert(`Event "${event.name}" has reached the video limit (50). Please upgrade or create a new event.`);
          return;
        }
      }

      let coverUrl = generatedCoverUrl || "";
      let logoUrl = "";
      
      if (coverFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: coverFile });
        coverUrl = file_url;
      }
      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        logoUrl = file_url;
      }

      const eventData = {
        ...formData,
        host_email: user.email,
        cover_image_url: coverUrl,
        logo_url: logoUrl,
        is_active: true,
        photo_count: 0,
        qr_code_data: "",
        print_service_enabled: false,
        tickets_sold: 0,
        co_hosts: [] // Initialize empty co_hosts array
      };

      if (eventData.expiration_date === "") {
        eventData.expiration_date = null;
      }
      if (eventData.start_date === "") { // Handle new start_date field
        eventData.start_date = null;
      }
      // Handle ticket_sale_start_date
      if (eventData.ticket_sale_start_date === "") {
        eventData.ticket_sale_start_date = null;
      }
      
      if (eventData.is_paid_event) {
        const ticketPrice = parseFloat(eventData.ticket_price);
        
        if (isNaN(ticketPrice) || ticketPrice < 0) {
          alert("Please enter a valid ticket price (0 or greater)");
          return;
        }
        
        eventData.ticket_price = ticketPrice;
        
        if (eventData.max_tickets) {
          eventData.max_tickets = parseInt(eventData.max_tickets);
        }
      } else {
        delete eventData.ticket_price;
        delete eventData.ticket_description;
        delete eventData.max_tickets;
        delete eventData.ticket_sale_start_date; // Also delete if not a paid event
      }

      console.log("Creating event with data:", eventData);
      const newEvent = await base44.entities.Event.create(eventData);
      console.log("Event created successfully:", newEvent);

      await base44.auth.updateMe({ credits: (user.credits || 0) - 2 });
      console.log("Credits updated");

      const eventGalleryUrl = `${window.location.origin}${createPageUrl(`EventGallery?eventId=${newEvent.id}`)}`;
      await base44.entities.Event.update(newEvent.id, { qr_code_data: eventGalleryUrl });
      console.log("QR code data updated");

      // Navigate after a small delay to ensure database consistency
      setTimeout(() => {
        navigate(createPageUrl(`EventGallery?eventId=${newEvent.id}`));
      }, 500);
    } catch (error) {
      console.error("Error creating event:", error);
      alert(`Failed to create event: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const isPremiumUser = currentUser && (currentUser.subscription_plan === 'pro' || currentUser.subscription_plan === 'business');

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("Home"))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        <Card className="shadow-xl border-2 border-purple-100">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Create New Event
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  Event Name *
                  <Hint content="This will be the main title for your event gallery. Make it descriptive and engaging!"></Hint>
                </Label>
                <div className="relative mt-2">
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={isListeningName ? "Listening..." : "Birthday Party, Wedding, Conference..."} required />
                  {speechSupported && (
                    <Button type="button" size="icon" variant={isListeningName ? "destructive" : "ghost"} onClick={() => handleListen('name')} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" title="Dictate event name">
                      <Mic className={`w-4 h-4 ${isListeningName ? 'animate-pulse' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="description" className="flex items-center gap-2">
                  Description
                  <Hint content="Provide more details about your event. This will be shown on the event gallery page."></Hint>
                </Label>
                <div className="relative mt-2">
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={isListeningDesc ? "Listening..." : "Tell attendees about your event..."} className="pr-10" rows={3} />
                  {speechSupported && (
                    <Button type="button" size="icon" variant={isListeningDesc ? "destructive" : "ghost"} onClick={() => handleListen('description')} className="absolute right-1 top-2 h-8 w-8" title="Dictate description">
                      <Mic className={`w-4 h-4 ${isListeningDesc ? 'animate-pulse' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  Event Location
                  <Hint content="Enter the full address where the event will be held. Guests can get Google Maps directions to this location." />
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="location"
                    value={formData.location_address}
                    onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                    placeholder={isListeningLocation ? "Listening..." : "123 Main Street, City, State ZIP"}
                    className="pr-10"
                  />
                  {speechSupported && (
                    <Button 
                      type="button" 
                      size="icon" 
                      variant={isListeningLocation ? "destructive" : "ghost"} 
                      onClick={() => handleListen('location')} 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" 
                      title="Dictate location"
                    >
                      <Mic className={`w-4 h-4 ${isListeningLocation ? 'animate-pulse' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" />
                  Choose a Template
                  <Hint content="Select a pre-designed theme that matches your event type. Colors and styling will be automatically optimized." />
                </Label>
                <EventTemplateSelector
                  selected={formData.event_template}
                  onSelect={(template, color) => setFormData({ ...formData, event_template: template, theme_color: color })}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4" />
                  Theme Color
                  <Hint content="Choose a color that best represents your event. This color will be used for accents and highlights on your event page."></Hint>
                </Label>
                <div className="grid grid-cols-8 gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({ ...formData, theme_color: color })} className={`w-10 h-10 rounded-lg transition-all duration-200 ${formData.theme_color === color ? "ring-4 ring-offset-2 ring-purple-400 scale-110" : "hover:scale-105"}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="cover" className="flex items-center gap-2">
                  Cover Image
                  <Hint content="Upload an eye-catching image that will serve as the background for your event page."></Hint>
                </Label>
                <div className="mt-2 space-y-3">
                  <Input id="cover" type="file" accept="image/*" onChange={(e) => {setCoverFile(e.target.files[0]); setGeneratedCoverUrl("");}} />
                  
                  {isPremiumUser && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-500">OR</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateCoverImage}
                        disabled={generatingCover || !formData.name}
                        className="w-full gap-2 border-purple-200 hover:border-purple-400"
                      >
                        <Sparkles className={`w-4 h-4 ${generatingCover ? 'animate-spin' : ''}`} />
                        {generatingCover ? "Generating AI Cover..." : "Generate AI Cover Image"}
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-2">PRO</Badge>
                      </Button>
                      
                      {generatedCoverUrl && (
                        <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">AI Cover Generated!</span>
                          </div>
                          <img src={generatedCoverUrl} alt="Generated Cover" className="w-full h-32 object-cover rounded" />
                          <p className="text-xs text-green-700 mt-2">This AI-generated cover will be used for your event.</p>
                        </div>
                      )}
                      
                      {!formData.name && (
                        <p className="text-xs text-gray-500">Enter an event name to generate an AI cover image</p>
                      )}
                    </div>
                  )}
                  
                  {!isPremiumUser && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm text-purple-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span><strong>Pro Feature:</strong> Upgrade to Pro or Business to generate AI cover images instantly!</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="logo" className="flex items-center gap-2">
                  Event Logo
                  <Hint content="Upload your event's logo. It will appear prominently on your event page."></Hint>
                </Label>
                <div className="mt-2">
                  <Input id="logo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className="flex items-center gap-2">
                    Event Start Date & Time
                    <Hint content="When does your event begin? This helps guests know when to arrive and when the event is live." />
                  </Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">When guests can start attending</p>
                </div>

                <div>
                  <Label htmlFor="expiration" className="flex items-center gap-2">
                    Event End Date & Time
                    <Hint content="When does your event end? After this time, uploads may be disabled (unless you enable the 72-hour window)." />
                  </Label>
                  <Input
                    id="expiration"
                    type="datetime-local"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">When the event concludes</p>
                </div>
              </div>
              
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Event Features</h3>
                
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="allow_video_upload"
                    checked={formData.allow_video_upload}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_video_upload: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="allow_video_upload" className="flex items-center gap-2 text-base cursor-pointer font-medium">
                      Allow Video Uploads
                      <Hint content="Enable this to allow attendees to upload short video clips to your event gallery."></Hint>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="allow_post_event_uploads"
                    checked={formData.allow_post_event_uploads}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_post_event_uploads: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="allow_post_event_uploads" className="flex items-center gap-2 text-base cursor-pointer font-medium">
                      Allow 72-Hour Upload Window
                      <Hint content="Let guests upload photos up to 72 hours after the event ends. Perfect for late submissions!"></Hint>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="guestbook_enabled"
                    checked={formData.guestbook_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, guestbook_enabled: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="guestbook_enabled" className="flex items-center gap-2 text-base cursor-pointer font-medium">
                      Enable Guestbook
                      <Hint content="Let attendees leave written messages and notes for the event, creating a digital guestbook." />
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="watermark_enabled"
                    checked={formData.watermark_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, watermark_enabled: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="watermark_enabled" className="flex items-center gap-2 text-base cursor-pointer font-medium">
                      Add Watermark to Photos
                      <Hint content="Automatically add a watermark (Eventpix QR or custom text) to all photos to protect and brand them." />
                    </Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="is_paid_event"
                    checked={formData.is_paid_event}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid_event: checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="is_paid_event" className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                      This is a Paid Event (Sell Tickets)
                      <Hint content="Enable ticketing to charge admission for your event. Attendees will purchase tickets via Stripe and receive them instantly via email." />
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">Collect ticket fees and manage event registration</p>
                  </div>
                </div>

                {formData.is_paid_event && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 pl-6 border-l-2 border-purple-200"
                  >
                    <div>
                      <Label htmlFor="ticket_sale_start_date">Ticket Sales Start Date & Time (Optional)</Label>
                      <Input
                        id="ticket_sale_start_date"
                        type="datetime-local"
                        value={formData.ticket_sale_start_date}
                        onChange={(e) => setFormData({ ...formData, ticket_sale_start_date: e.target.value })}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to make tickets available immediately. Set a future date for a pre-sale countdown.</p>
                    </div>

                    <div>
                      <Label htmlFor="ticket_price">Ticket Price (USD) *</Label>
                      <Input
                        id="ticket_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.ticket_price}
                        onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                        placeholder="25.00"
                        required={formData.is_paid_event}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Set to $0.00 for free registration with tickets</p>
                    </div>

                    <div>
                      <Label htmlFor="ticket_description">Ticket Description</Label>
                      <Textarea
                        id="ticket_description"
                        value={formData.ticket_description}
                        onChange={(e) => setFormData({ ...formData, ticket_description: e.target.value })}
                        placeholder="What's included with this ticket? (e.g., General Admission, VIP Access, Food & Drinks)"
                        rows={3}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="max_tickets">Maximum Tickets Available (Optional)</Label>
                      <Input
                        id="max_tickets"
                        type="number"
                        value={formData.max_tickets}
                        onChange={(e) => setFormData({ ...formData, max_tickets: e.target.value })}
                        placeholder="Leave empty for unlimited"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Set a capacity limit if your venue has limited space</p>
                    </div>
                  </motion.div>
                )}
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg h-12">
                {loading ? "Creating Event..." : "Create Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
