
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, ExternalLink, Copy, Mail, Phone, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function QRCodeDisplay({ open, onOpenChange, event }) {
  const [emailInput, setEmailInput] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  if (!event) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(event.qr_code_data)}&color=${encodeURIComponent(event.theme_color?.replace('#', '') || '8B5CF6')}&bgcolor=FFFFFF&qzone=2&format=svg`;
  
  // High-resolution QR code for printing (2000x2000 pixels)
  const printableQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=2000x2000&data=${encodeURIComponent(event.qr_code_data)}&color=${encodeURIComponent(event.theme_color?.replace('#', '') || '8B5CF6')}&bgcolor=FFFFFF&qzone=4&format=png`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${event.name}-QR-Code.svg`;
      link.href = url;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      alert("Failed to download QR code. Please try again.");
    }
  };

  const handleDownloadPrintable = async () => {
    try {
      const response = await fetch(printableQrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${event.name}-QR-Code-PRINTABLE.png`;
      link.href = url;
      link.click();
      window.URL.revokeObjectURL(url);
      alert("✅ High-resolution QR code downloaded! Perfect for printing on posters, signs, or table cards.");
    } catch (error) {
      console.error("Failed to download printable QR code:", error);
      alert("Failed to download printable QR code. Please try again.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(event.qr_code_data);
    alert("Event link copied to clipboard!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Join "${event.name}" on QRPix! Scan the QR code or use this link to upload and view photos.`,
          url: event.qr_code_data,
        });
      } catch (error) {
        console.log("Share canceled");
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTestQR = () => {
    window.open(event.qr_code_data, '_blank');
  };

  const handleSocialShare = (platform) => {
    const text = encodeURIComponent(`Join "${event.name}" on QRPix! Upload and view photos in real-time. 📸✨`);
    const url = encodeURIComponent(event.qr_code_data);
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const createEmailBody = () => {
    const eventDate = event.expiration_date ? format(new Date(event.expiration_date), "EEEE, MMMM d, yyyy 'at' h:mm a") : "No end date specified";
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #faf5ff, #fce7f3); padding: 20px; border-radius: 12px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${event.cover_image_url ? `
            <div style="width: 100%; height: 200px; overflow: hidden;">
              <img src="${event.cover_image_url}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          
          <div style="padding: 30px;">
            <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
              You're Invited to ${event.name}!
            </h1>
            
            ${event.description ? `
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 15px 0;">
                ${event.description}
              </p>
            ` : ''}
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 15px 0;">
                📅 Event Details
              </h3>
              
              ${event.location_address ? `
                <div style="margin-bottom: 12px;">
                  <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">📍 Location</span>
                  <span style="color: #111827; font-size: 15px; font-weight: 500;">${event.location_address}</span>
                </div>
              ` : ''}
              
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">🕒 Event Date</span>
                <span style="color: #111827; font-size: 15px; font-weight: 500;">${eventDate}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${event.qr_code_data}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                📸 View Event & Upload Photos
              </a>
            </div>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>💡 How it works:</strong> Click the button above to access the event gallery. You can upload photos and videos, view everyone's pictures in real-time, and download your favorites!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
            
            <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
              Or copy this link: <br/>
              <span style="color: #8B5CF6; font-weight: 500; word-break: break-all;">${event.qr_code_data}</span>
            </p>
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
          Powered by <strong style="color: #8B5CF6;">Eventpix QR</strong> - Scan. Smile. Capture. Share.
        </p>
      </div>
    `;
  };

  const createTextMessage = () => {
    const eventDate = event.expiration_date ? format(new Date(event.expiration_date), "EEEE, MMM d, yyyy 'at' h:mm a") : "Date TBD";
    
    return `📸 You're Invited to ${event.name}!

${event.description ? event.description + '\n\n' : ''}📅 When: ${eventDate}
${event.location_address ? '📍 Where: ' + event.location_address + '\n' : ''}
🔗 Event Link: ${event.qr_code_data}

Tap the link to view photos, upload your own pictures, and join the fun! 

Powered by Eventpix QR`;
  };

  const handleSendSMS = () => {
    if (!phoneInput.trim()) {
      alert("Please enter a phone number");
      return;
    }

    const message = createTextMessage();
    // Use '&' for iPhone, '?' for Android/other, as iPhone often treats '?' as part of the number.
    const smsUrl = `sms:${phoneInput}${navigator.userAgent.includes('iPhone') ? '&' : '?'}body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    
    alert("Opening your messaging app...\n\nIf it doesn't open automatically, copy the text and send it manually.");
  };

  const handleCopyTextMessage = () => {
    const message = createTextMessage();
    navigator.clipboard.writeText(message);
    alert("Text message copied to clipboard! You can now paste it into any messaging app (SMS, WhatsApp, etc.)");
  };

  const handleSendSingleEmail = async () => {
    if (!emailInput.trim()) {
      alert("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: emailInput.trim(),
        subject: `You're invited to ${event.name}!`,
        body: createEmailBody()
      });
      alert("Invitation sent successfully!");
      setEmailInput("");
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send invitation. Please try again.");
    }
    setSending(false);
  };

  const handleSendBulkEmails = async () => {
    const emails = bulkEmails.split(/[\n,;]/).map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) {
      alert("Please enter at least one email address");
      return;
    }

    setSending(true);
    try {
      for (const email of emails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You're invited to ${event.name}!`,
          body: createEmailBody()
        });
      }
      alert(`Successfully sent ${emails.length} invitation(s)!`);
      setBulkEmails("");
    } catch (error) {
      console.error("Failed to send emails:", error);
      alert("Failed to send some invitations. Please try again.");
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Share Your Event</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">Text/SMS</TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-6 mt-6">
            <div className="flex justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-purple-300">
              <img 
                src={qrCodeUrl} 
                alt="Event QR Code" 
                className="w-[300px] h-[300px]"
              />
            </div>

            <div className="text-center bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{event.name}</h3>
              <p className="text-sm text-gray-700 mb-2 font-medium">
                📱 Have guests scan this QR code with their phone camera
              </p>
              <p className="text-xs text-gray-600">
                They'll be taken directly to your event where they can upload photos and see everyone's pictures in real-time!
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Event Link (for sharing)</Label>
              <div className="flex gap-2">
                <Input 
                  value={event.qr_code_data} 
                  readOnly 
                  className="flex-1 text-xs"
                />
                <Button onClick={handleCopyLink} size="icon" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download (Small)
                </Button>
                <Button onClick={handleShare} variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Link
                </Button>
              </div>
              
              {/* NEW: Printable QR Code Button */}
              <Button 
                onClick={handleDownloadPrintable} 
                className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Printer className="w-5 h-5" />
                Download Large Printable QR Code (2000x2000px)
              </Button>
              
              <Button onClick={handleTestQR} className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <ExternalLink className="w-4 h-4" />
                Test QR Code (Opens Event Gallery)
              </Button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <p className="text-green-800 font-semibold mb-2">🖨️ Printing Tip:</p>
              <p className="text-green-700 text-xs leading-relaxed">
                The <strong>Large Printable QR Code</strong> is 2000x2000 pixels - perfect for printing on:
              </p>
              <ul className="list-disc list-inside space-y-1 text-green-700 text-xs mt-2">
                <li>Posters and banners at the venue entrance</li>
                <li>Table cards or tent cards on each table</li>
                <li>Event signage and displays</li>
                <li>Large format prints up to 20" x 20" or bigger!</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg mb-2">Share on Social Media</h3>
              <p className="text-sm text-gray-600">Let everyone know about your event!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleSocialShare('facebook')}
                className="h-16 bg-[#1877F2] hover:bg-[#0C63D4] text-white flex flex-col gap-1"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm font-medium">Facebook</span>
              </Button>

              <Button
                onClick={() => handleSocialShare('twitter')}
                className="h-16 bg-[#1DA1F2] hover:bg-[#0C8BD9] text-white flex flex-col gap-1"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="text-sm font-medium">Twitter/X</span>
              </Button>

              <Button
                onClick={() => handleSocialShare('whatsapp')}
                className="h-16 bg-[#25D366] hover:bg-[#1EBE57] text-white flex flex-col gap-1"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </Button>

              <Button
                onClick={() => handleSocialShare('linkedin')}
                className="h-16 bg-[#0077B5] hover:bg-[#005E93] text-white flex flex-col gap-1"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-sm font-medium">LinkedIn</span>
              </Button>

              <Button
                onClick={() => handleSocialShare('telegram')}
                className="h-16 bg-[#0088CC] hover:bg-[#0077B3] text-white flex flex-col gap-1"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-sm font-medium">Telegram</span>
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="h-16 flex flex-col gap-1"
              >
                <Copy className="w-6 h-6" />
                <span className="text-sm font-medium">Copy Link</span>
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📱 Pro Tip:</p>
              <p className="text-xs">Share on your story or feed to let all your followers know about your event! They can join with just one click.</p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-6 mt-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Send Single Invitation
              </h3>
              <p className="text-sm text-gray-600 mb-4">Send a personalized invitation to one guest</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="guest@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendSingleEmail} 
                  disabled={sending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Send Bulk Invitations
              </h3>
              <p className="text-sm text-gray-600 mb-4">Send invitations to multiple guests at once (separate with commas, semicolons, or new lines)</p>
              <Textarea
                placeholder="guest1@example.com, guest2@example.com&#10;guest3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
                className="mb-4"
              />
              <Button 
                onClick={handleSendBulkEmails} 
                disabled={sending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {sending ? "Sending..." : "Send All Invitations"}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📧 What guests will receive:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>A beautiful email invitation to {event.name}</li>
                <li>A direct link to join and upload photos</li>
                <li>Instructions on how to participate</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6 mt-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Send via Text Message
              </h3>
              <p className="text-sm text-gray-600">Share event details through SMS or messaging apps</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <Label className="text-sm font-semibold mb-2 block">Message Preview:</Label>
              <div className="bg-white border border-gray-300 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-gray-700 max-h-60 overflow-y-auto">
                {createTextMessage()}
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleCopyTextMessage}
                className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Copy className="w-4 h-4" />
                Copy Text (Paste in Any App)
              </Button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-xs text-gray-500">OR SEND DIRECTLY</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Send to Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendSMS}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Send
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This will open your phone's messaging app with the pre-filled message
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-800 font-semibold mb-2">💡 Works with all messaging apps:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 text-xs">
                <li>SMS/Text Messages (built-in)</li>
                <li>WhatsApp</li>
                <li>Facebook Messenger</li>
                <li>Telegram</li>
                <li>Any other messaging app!</li>
              </ul>
              <p className="text-blue-700 text-xs mt-2">
                Simply copy the message and paste it wherever you want to share it.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
