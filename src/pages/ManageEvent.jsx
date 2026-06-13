import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Power, Calendar, Download, Sparkles, QrCode, AlertCircle, Users, Edit, Bell, Check, Clock, Layout, Gamepad2, Upload, Mail, MessageSquare, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3 } from "lucide-react";
import { Hint } from "../components/ui/Hint";
import QRCodeDisplay from "../components/events/QRCodeDisplay";
import CoHostManager from "../components/events/CoHostManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import OnboardingDialog from "../components/tour/OnboardingDialog";
import { Badge } from "@/components/ui/badge"; // Added Badge import

export default function ManageEvent() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationMessage, setCancellationMessage] = useState("");
  const [sendingCancellation, setSendingCancellation] = useState(false);
  const [showManualTicketDialog, setShowManualTicketDialog] = useState(false);
  const [manualTicketData, setManualTicketData] = useState({
    attendeeEmail: "",
    attendeeName: "",
    attendeePhone: "",
    quantity: 1,
    notes: "",
    tableNumber: "",
    seatNumber: ""
  });
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    location_address: "",
    theme_color: "#8B5CF6",
    start_date: "",
    expiration_date: "",
    ticket_price: "",
    ticket_description: "",
    max_tickets: "",
    num_tables: "",
    people_per_table: "",
    generate_ai_cover: false
  });
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showTeamOnboarding, setShowTeamOnboarding] = useState(false);
  const [hasShownTeamOnboarding, setHasShownTeamOnboarding] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    title: "",
    message: "",
    attachments: []
  });
  const [updateAttachmentFiles, setUpdateAttachmentFiles] = useState([]);
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [eventUpdates, setEventUpdates] = useState([]);
  const [showUpdatesHistory, setShowUpdatesHistory] = useState(false);
  const [showBulkTicketDialog, setShowBulkTicketDialog] = useState(false);
  const [bulkTicketData, setBulkTicketData] = useState({
    ticketList: "",
    notes: ""
  });
  const [issuingBulkTickets, setIssuingBulkTickets] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [bulkTicketFile, setBulkTicketFile] = useState(null);
  const [showBulkResultsDialog, setShowBulkResultsDialog] = useState(false);
  const [bulkResults, setBulkResults] = useState({ successCount: 0, failCount: 0, results: [], ticketCodes: [] });
  const [issuedTickets, setIssuedTickets] = useState([]);
  const [showTicketManagerDialog, setShowTicketManagerDialog] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [deletingTickets, setDeletingTickets] = useState(false);
  const [smsFilter, setSmsFilter] = useState('all'); // 'all', 'sent', 'pending'


  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId") || urlParams.get("eventid");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const checkCoHostOnboarding = async () => {
      if (!hasShownTeamOnboarding && event) {
        try {
          const user = await base44.auth.me();
          if (event.co_hosts?.includes(user.email)) {
            const hasCompletedTeamOnboarding = localStorage.getItem('onboarding_team_completed');
            if (!hasCompletedTeamOnboarding) {
              setTimeout(() => {
                setShowTeamOnboarding(true);
                setHasShownTeamOnboarding(true);
              }, 500);
            }
          }
        } catch (error) {
          console.error("Error checking co-host onboarding:", error);
        }
      }
    };
    checkCoHostOnboarding();
  }, [event, hasShownTeamOnboarding]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find((e) => e.id === eventId);
      const isHost = foundEvent && (foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email));

      if (!foundEvent || !isHost) {
        navigate(createPageUrl("Home"));
        return;
      }

      setEvent(foundEvent);
      const photoData = await base44.entities.Photo.filter({ event_id: eventId }, "-created_date");
      setPhotos(photoData);

      const updates = await base44.entities.EventUpdate.filter({ event_id: eventId }, "-created_date");
      setEventUpdates(updates);

      if (foundEvent.photo_count !== photoData.length) {
        try {
          await base44.entities.Event.update(eventId, { photo_count: photoData.length });
          setEvent(prev => ({ ...prev, photo_count: photoData.length }));
        } catch (updateError) {
          console.error("Could not update photo count:", updateError);
          setEvent(prev => ({ ...prev, photo_count: photoData.length }));
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const loadIssuedTickets = async () => {
    setLoadingTickets(true);
    try {
      const tickets = await base44.entities.Ticket.filter({ event_id: eventId }, '-created_date');
      setIssuedTickets(tickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
      alert("Failed to load tickets. Please try again.");
    }
    setLoadingTickets(false);
  };

  const handleOpenTicketManager = async () => {
    setShowTicketManagerDialog(true);
    await loadIssuedTickets();
  };

  const handleToggleSMS = async (ticketId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await base44.entities.Ticket.update(ticketId, {
        sms_sent: newStatus,
        sms_sent_at: newStatus ? new Date().toISOString() : null
      });
      
      // Update local state
      setIssuedTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, sms_sent: newStatus, sms_sent_at: newStatus ? new Date().toISOString() : null }
          : t
      ));
    } catch (error) {
      console.error("Error toggling SMS status:", error);
      alert("Failed to update SMS status. Please try again.");
    }
  };

  const handleMarkAllSMSSent = async () => {
    const filteredList = getFilteredTickets();
    
    if (filteredList.length === 0) {
      alert("No tickets to mark");
      return;
    }

    if (!window.confirm(`Mark ${filteredList.length} ticket(s) as SMS sent?`)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      for (const ticket of filteredList) {
        await base44.entities.Ticket.update(ticket.id, {
          sms_sent: true,
          sms_sent_at: now
        });
      }
      
      await loadIssuedTickets();
      alert(`✅ Marked ${filteredList.length} ticket(s) as SMS sent!`);
    } catch (error) {
      console.error("Error marking SMS sent:", error);
      alert("Failed to update tickets. Please try again.");
    }
  };

  const getFilteredTickets = () => {
    if (smsFilter === 'all') return issuedTickets;
    if (smsFilter === 'sent') return issuedTickets.filter(t => t.sms_sent);
    if (smsFilter === 'pending') return issuedTickets.filter(t => !t.sms_sent);
    return issuedTickets;
  };

  const handleDeleteSingleTicket = async (ticketId, quantity) => {
    if (!window.confirm("Delete this ticket? The attendee will no longer be able to check in.")) {
      return;
    }

    try {
      await base44.entities.Ticket.delete(ticketId);
      
      // Update tickets_sold count
      const newTicketsSold = Math.max(0, (event.tickets_sold || 0) - quantity);
      await base44.entities.Event.update(eventId, { tickets_sold: newTicketsSold });
      setEvent(prev => ({ ...prev, tickets_sold: newTicketsSold }));
      
      alert("✅ Ticket deleted successfully!");
      await loadIssuedTickets();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      alert("Failed to delete ticket. Please try again.");
    }
  };

  const handleDeleteAllTickets = async () => {
    if (issuedTickets.length === 0) {
      alert("No tickets to delete.");
      return;
    }

    const confirmText = `DELETE ALL ${issuedTickets.length} TICKETS`;
    const userInput = window.prompt(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\nThis will PERMANENTLY delete ALL ${issuedTickets.length} issued tickets for this event.\n\nAll attendees will lose access and cannot check in.\n\nType "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert("Text doesn't match. Deletion cancelled for your safety.");
      }
      return;
    }

    setDeletingTickets(true);
    try {
      for (const ticket of issuedTickets) {
        await base44.entities.Ticket.delete(ticket.id);
      }

      // Reset tickets_sold to 0
      await base44.entities.Event.update(eventId, { tickets_sold: 0 });
      setEvent(prev => ({ ...prev, tickets_sold: 0 }));

      alert(`✅ Successfully deleted all ${issuedTickets.length} tickets and reset the counter!`);
      setShowTicketManagerDialog(false);
      setIssuedTickets([]);
    } catch (error) {
      console.error("Error deleting all tickets:", error);
      alert("Failed to delete all tickets. Please try again.");
    }
    setDeletingTickets(false);
  };

  const handleResetTicketCount = async () => {
    if (!window.confirm("Reset the tickets_sold counter to match actual issued tickets?\n\nThis will recalculate based on database records.")) {
      return;
    }

    try {
      const tickets = await base44.entities.Ticket.filter({ event_id: eventId });
      const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
      
      await base44.entities.Event.update(eventId, { tickets_sold: totalQuantity });
      setEvent(prev => ({ ...prev, tickets_sold: totalQuantity }));
      
      alert(`✅ Counter reset! Tickets sold: ${totalQuantity}`);
      await loadData();
    } catch (error) {
      console.error("Error resetting ticket count:", error);
      alert("Failed to reset counter. Please try again.");
    }
  };

  const handleExportTickets = () => {
    const csvContent = `Name,Email,Phone,Ticket Code,Quantity,Table,Seat,Status,SMS Sent,Purchase Date\n${issuedTickets
      .map(t => `"${t.attendee_name}","${t.attendee_email}","${t.attendee_phone || ''}","${t.ticket_code}",${t.quantity},${t.table_number || ''},${t.seat_number || ''},"${t.status}",${t.sms_sent ? 'TRUE' : 'FALSE'},"${format(new Date(t.created_date), 'yyyy-MM-dd HH:mm')}"`)
      .join('\n')}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name}_all_tickets_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleCopyAllTicketsMessage = () => {
    const ticketsToCopy = getFilteredTickets();

    if (ticketsToCopy.length === 0) {
      alert("No tickets to copy");
      return;
    }

    const eventDate = event.expiration_date ? format(new Date(event.expiration_date), "EEEE, MMM d, yyyy 'at' h:mm a") : "Date TBD";
    
    // Create formatted ticket codes list with seating info
    const ticketCodesList = ticketsToCopy.map(ticket => {
      const seatingInfo = ticket.table_number 
        ? ` (Table ${ticket.table_number}${ticket.seat_number ? `, Seat ${ticket.seat_number}` : ''})` 
        : '';
      return `${ticket.attendee_name}: ${ticket.ticket_code}${seatingInfo}`;
    }).join('\n');

    // Create the complete welcome message with ALL ticket codes
    const fullMessage = `🎫 Your Tickets for ${event.name}!

${event.description ? event.description + '\n\n' : ''}📅 When: ${eventDate}
${event.location_address ? '📍 Where: ' + event.location_address + '\n' : ''}
🔗 Event Link: ${event.qr_code_data}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TICKET CODES:

${ticketCodesList}
━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 IMPORTANT INSTRUCTIONS:
• Save your ticket code - you'll need it at check-in
• Tap the event link above to view photos and upload your own
• Arrive early for smooth check-in
• Show your ticket code (or this message) at the entrance

Questions? Reply to this message or contact the event host.

Powered by Eventpix QR - Scan. Smile. Capture. Share.`;

    navigator.clipboard.writeText(fullMessage);
    alert(`✅ Complete message with ALL ${ticketsToCopy.length} ticket codes copied!\n\nNow paste into your group text, WhatsApp, or individual messages. Recipients will have everything they need!`);
  };

  const handleUpdateEvent = async (updates) => {
    try {
      await base44.entities.Event.update(eventId, updates);
      await loadData();
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const handleDownloadSharePack = async () => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generateSharePack', { eventId });
      if (response.status === 200) {
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = response.headers['content-disposition'];
        let filename = "share-pack.zip";
        if (contentDisposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(contentDisposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const errorData = response.data;
        alert(`Failed to generate share pack: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('An error occurred while downloading the share pack.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (window.confirm("Delete this photo?")) {
      try {
        const likes = await base44.entities.Like.filter({ photo_id: photoId });
        for (const like of likes) {
          try {
            await base44.entities.Like.delete(like.id);
          } catch (err) {
            console.log(`Like ${like.id} already deleted or not found`);
          }
        }

        const comments = await base44.entities.Comment.filter({ photo_id: photoId });
        for (const comment of comments) {
          try {
            await base44.entities.Comment.delete(comment.id);
          } catch (err) {
            console.log(`Comment ${comment.id} already deleted or not found`);
          }
        }

        const reactions = await base44.entities.Reaction.filter({ photo_id: photoId });
        for (const reaction of reactions) {
          try {
            await base44.entities.Reaction.delete(reaction.id);
          } catch (err) {
            console.log(`Reaction ${reaction.id} already deleted or not found`);
          }
        }

        const votes = await base44.entities.Vote.filter({ photo_id: photoId });
        for (const vote of votes) {
          try {
            await base44.entities.Vote.delete(vote.id);
          } catch (err) {
            console.log(`Vote ${vote.id} already deleted or not found`);
          }
        }

        await base44.entities.Photo.delete(photoId);

        try {
          const newCount = Math.max(0, (event.photo_count || 0) - 1);
          await base44.entities.Event.update(eventId, { photo_count: newCount });
          setEvent(prev => ({ ...prev, photo_count: newCount }));
        } catch (updateError) {
          console.log("Could not update photo count:", updateError);
        }

        await loadData();
      } catch (error) {
        console.error("Error deleting photo:", error);
        alert("Failed to delete photo. Please try again.");
      }
    }
  };

  const handleApprovePhoto = async (photoId) => {
    try {
      await base44.entities.Photo.update(photoId, { is_approved: true });
      await loadData();
    } catch (error) {
      console.error("Error approving photo:", error);
      alert("Failed to approve photo. Please try again.");
    }
  };

  const handleToggleActive = async () => {
    const newValue = !event.is_active;
    setEvent({ ...event, is_active: newValue });

    try {
      await base44.entities.Event.update(eventId, { is_active: newValue });
    } catch (error) {
      console.error("Error toggling event status:", error);
      setEvent({ ...event, is_active: !newValue });
      alert("Failed to update event status. Please try again.");
    }
  };

  const handleToggleSetting = async (setting, value) => {
    const previousValue = event[setting];
    setEvent({ ...event, [setting]: value });

    try {
      await base44.entities.Event.update(eventId, { [setting]: value });
    } catch (error) {
      console.error(`Error updating ${setting}:`, error);
      setEvent({ ...event, [setting]: previousValue });
      alert(`Failed to update setting. Please try again.`);
    }
  };

  const handleSendCancellationNotice = async () => {
    if (!cancellationMessage.trim()) {
      alert("Please enter a cancellation message for your attendees.");
      return;
    }

    if (!window.confirm("This will send cancellation emails to all event attendees. Continue?")) {
      return;
    }

    setSendingCancellation(true);
    try {
      const response = await base44.functions.invoke('sendCancellationNotice', {
        eventId: eventId,
        cancellationMessage: cancellationMessage
      });

      if (response.data.success) {
        alert(`✅ Cancellation notices sent!\n\n📧 Emails sent: ${response.data.emailsSent}\n❌ Failed: ${response.data.emailsFailed}\n👥 Total recipients: ${response.data.totalRecipients}`);

        const shouldDeactivate = window.confirm("Would you like to mark this event as inactive?\n\nThis will prevent new uploads and hide it from public view, but won't delete any data.");

        if (shouldDeactivate) {
          await base44.entities.Event.update(eventId, { is_active: false });
          setEvent(prev => ({ ...prev, is_active: false }));
        }

        setShowCancelDialog(false);
        setCancellationMessage("");
      } else {
        throw new Error(response.data.error || "Failed to send cancellation notices");
      }
    } catch (error) {
      console.error("Error sending cancellation notice:", error);
      alert(`Failed to send cancellation notices: ${error.message}`);
    }
    setSendingCancellation(false);
  };

  const handleDeleteEvent = async () => {
    const confirmText = event.name;
    const userInput = window.prompt(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\nThis will PERMANENTLY delete:\n• The event "${event.name}"\n• All ${photos.length} photos and videos\n• All likes, comments, and reactions\n• All tickets and registrations\n• All guestbook entries\n\nThis action CANNOT be undone!\n\nType the event name "${confirmText}" to confirm deletion:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert("Event name doesn't match. Deletion cancelled for your safety.");
      }
      return;
    }

    const finalConfirm = window.confirm(`Are you ABSOLUTELY SURE you want to permanently delete this event?\n\nThis is your last chance to cancel.`);
    if (!finalConfirm) return;

    try {
      for (const photo of photos) {
        const likes = await base44.entities.Like.filter({ photo_id: photo.id });
        for (const like of likes) {
          await base44.entities.Like.delete(like.id);
        }

        const comments = await base44.entities.Comment.filter({ photo_id: photo.id });
        for (const comment of comments) {
          await base44.entities.Comment.delete(comment.id);
        }

        const reactions = await base44.entities.Reaction.filter({ photo_id: photo.id });
        for (const reaction of reactions) {
          await base44.entities.Reaction.delete(reaction.id);
        }

        const votes = await base44.entities.Vote.filter({ photo_id: photo.id });
        for (const vote of votes) {
          await base44.entities.Vote.delete(vote.id);
        }

        await base44.entities.Photo.delete(photo.id);
      }

      await base44.entities.Event.delete(eventId);

      const lastEventId = localStorage.getItem('lastEventId');
      if (lastEventId === eventId) {
        localStorage.removeItem('lastEventId');
      }

      alert("Event deleted successfully.");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    }
  };

  const handleIssueManualTicket = async () => {
    if (!manualTicketData.attendeeName || !manualTicketData.quantity) {
      alert("Please fill in attendee name and quantity");
      return;
    }

    if (!manualTicketData.attendeeEmail && !manualTicketData.attendeePhone) {
      alert("Please provide either an email address OR phone number for the attendee");
      return;
    }

    setIssuingTicket(true);
    try {
      const response = await base44.functions.invoke('issueManualTicket', {
        eventId: eventId,
        attendeeEmail: manualTicketData.attendeeEmail.trim() || `no-email-${Date.now()}@eventpix.local`,
        attendeeName: manualTicketData.attendeeName.trim(),
        attendeePhone: manualTicketData.attendeePhone.trim(),
        quantity: parseInt(manualTicketData.quantity),
        notes: manualTicketData.notes.trim(),
        tableNumber: manualTicketData.tableNumber ? parseInt(manualTicketData.tableNumber) : null,
        seatNumber: manualTicketData.seatNumber ? parseInt(manualTicketData.seatNumber) : null
      });

      if (response.data.success) {
        const ticketCode = response.data.ticket.ticket_code;
        const hasEmail = manualTicketData.attendeeEmail.trim();
        const tableInfo = manualTicketData.tableNumber ? `\n📍 Table ${manualTicketData.tableNumber}${manualTicketData.seatNumber ? `, Seat ${manualTicketData.seatNumber}` : ''}` : '';
        
        const textMessage = `🎫 Your Ticket for ${event.name}\n\nHi ${manualTicketData.attendeeName}! Your ticket is confirmed.\n\nTicket Code: ${ticketCode}\nQuantity: ${manualTicketData.quantity} ticket(s)${tableInfo}\n\n${event.location_address ? '📍 Location: ' + event.location_address + '\n' : ''}🔗 View Event: ${event.qr_code_data}\n\nSave this code - you'll need it at check-in!\n\nPowered by Eventpix QR`;

        let confirmMessage = `✅ Ticket issued successfully!\n\n🎫 Ticket Code: ${ticketCode}${tableInfo}`;
        
        if (hasEmail) {
          confirmMessage += `\n📧 Email sent to: ${manualTicketData.attendeeEmail}`;
        } else {
          confirmMessage += `\n⚠️ No email provided - ticket created with phone only`;
        }

        if (manualTicketData.attendeePhone) {
          const sendText = window.confirm(`${confirmMessage}\n\nWould you like to copy a text message to send to the attendee?`);
          
          if (sendText) {
            navigator.clipboard.writeText(textMessage);
            const shouldOpenSMS = window.confirm("Text message copied to clipboard!\n\nWould you like to open your messaging app now?");
            if (shouldOpenSMS) {
              const smsUrl = `sms:${manualTicketData.attendeePhone}${navigator.userAgent.includes('iPhone') ? '&' : '?'}body=${encodeURIComponent(textMessage)}`;
              window.location.href = smsUrl;
            }
          }
        } else {
          alert(confirmMessage + "\n\n💡 Tip: Print the ticket code or share it manually with the attendee.");
        }

        setShowManualTicketDialog(false);
        setManualTicketData({
          attendeeEmail: "",
          attendeeName: "",
          attendeePhone: "",
          quantity: 1,
          notes: "",
          tableNumber: "",
          seatNumber: ""
        });
        await loadData();
      } else {
        throw new Error(response.data.error || "Failed to issue ticket");
      }
    } catch (error) {
      console.error("Error issuing manual ticket:", error);
      alert(`Failed to issue ticket: ${error.message}`);
    }
    setIssuingTicket(false);
  };

  const handleSendReminder = async (reminderType) => {
    const reminderNames = {
      'day_before': 'Day Before Reminder',
      '4_hours_before': '4 Hours Before Reminder'
    };

    if (!window.confirm(`Send ${reminderNames[reminderType]} to all ticket holders?\n\nThis will email everyone who has purchased tickets for this event.`)) {
      return;
    }

    setSendingReminder(true);
    try {
      const response = await base44.functions.invoke('sendEventReminders', {
        eventId: eventId,
        reminderType: reminderType
      });

      if (response.data.success) {
        alert(`✅ ${reminderNames[reminderType]} Sent!\n\n📧 Emails sent: ${response.data.emailsSent}\n❌ Failed: ${response.data.emailsFailed}\n👥 Total recipients: ${response.data.totalRecipients}`);
        setShowRemindersDialog(false);
      } else {
        throw new Error(response.data.error || "Failed to send reminders");
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      alert(`Failed to send reminders: ${error.message}`);
    }
    setSendingReminder(false);
  };

  const handleOpenEditDialog = () => {
    setEditFormData({
      name: event.name || "",
      description: event.description || "",
      location_address: event.location_address || "",
      theme_color: event.theme_color || "#8B5CF6",
      start_date: event.start_date ? format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm") : "",
      expiration_date: event.expiration_date ? format(new Date(event.expiration_date), "yyyy-MM-dd'T'HH:mm") : "",
      ticket_price: event.ticket_price !== undefined ? event.ticket_price.toString() : "",
      ticket_description: event.ticket_description || "",
      max_tickets: event.max_tickets !== undefined ? event.max_tickets.toString() : "",
      num_tables: event.num_tables !== undefined ? event.num_tables.toString() : "",
      people_per_table: event.people_per_table !== undefined ? event.people_per_table.toString() : "",
      generate_ai_cover: false
    });
    setEditCoverFile(null);
    setEditLogoFile(null);
    setShowEditDialog(true);
  };

  const handleGenerateAICover = async () => {
    if (!editFormData.name) {
      alert("Please enter an event name first to generate a cover image.");
      return;
    }

    const shouldGenerate = window.confirm(`Generate an AI cover image for "${editFormData.name}"?\n\nThis will use AI to create a unique cover image based on your event details.`);
    if (!shouldGenerate) return;

    setEditFormData(prev => ({ ...prev, generate_ai_cover: true }));

    try {
      const prompt = `Create a beautiful, professional event cover image for an event called "${editFormData.name}". ${editFormData.description ? `The event is about: ${editFormData.description}.` : ''} Style: Modern, vibrant, celebratory, high-quality photography style. Include abstract decorative elements. No text or words in the image.`;
      const result = await base44.integrations.Core.GenerateImage({ prompt });

      if (result.url) {
        const response = await fetch(result.url);
        const blob = await response.blob();
        const file = new File([blob], "ai-generated-cover.png", { type: "image/png" });
        setEditCoverFile(file);
        alert("✨ AI cover image generated successfully!");
      } else {
        throw new Error("No image URL returned from AI generation.");
      }
    } catch (error) {
      console.error("Error generating cover image:", error);
      alert("Failed to generate cover image. Please try again.");
    }

    setEditFormData(prev => ({ ...prev, generate_ai_cover: false }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      alert("Event name is required");
      return;
    }

    setSavingEdit(true);
    try {
      let coverUrl = event.cover_image_url;
      let logoUrl = event.logo_url;

      if (editCoverFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: editCoverFile });
        coverUrl = file_url;
      }

      if (editLogoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: editLogoFile });
        logoUrl = file_url;
      }

      const updates = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        location_address: editFormData.location_address.trim(),
        theme_color: editFormData.theme_color,
        cover_image_url: coverUrl,
        logo_url: logoUrl,
        start_date: editFormData.start_date ? new Date(editFormData.start_date).toISOString() : null,
        expiration_date: editFormData.expiration_date ? new Date(editFormData.expiration_date).toISOString() : null,
        num_tables: editFormData.num_tables && !isNaN(parseInt(editFormData.num_tables)) ? parseInt(editFormData.num_tables) : null,
        people_per_table: editFormData.people_per_table && !isNaN(parseInt(editFormData.people_per_table)) ? parseInt(editFormData.people_per_table) : null
      };

      if (event.is_paid_event) {
        const ticketPrice = parseFloat(editFormData.ticket_price);
        if (isNaN(ticketPrice) || ticketPrice < 0) {
          alert("Please enter a valid ticket price (0 or greater)");
          setSavingEdit(false);
          return;
        }
        updates.ticket_price = ticketPrice;
        updates.ticket_description = editFormData.ticket_description;

        if (editFormData.max_tickets && !isNaN(parseInt(editFormData.max_tickets))) {
          updates.max_tickets = parseInt(editFormData.max_tickets);
        } else {
          updates.max_tickets = null;
        }
      }

      await base44.entities.Event.update(eventId, updates);

      setShowEditDialog(false);
      await loadData();
      alert("✅ Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      alert(`Failed to update event: ${error.message}`);
    }
    setSavingEdit(false);
  };

  const handleSendUpdate = async () => {
    if (!updateData.title.trim() || !updateData.message.trim()) {
      alert("Please enter both a title and message for your update.");
      return;
    }

    if (!window.confirm("This will send update notifications to all event attendees. Continue?")) {
      return;
    }

    setSendingUpdate(true);
    try {
      let attachmentUrls = [];
      if (updateAttachmentFiles.length > 0) {
        for (const file of updateAttachmentFiles) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          attachmentUrls.push({ name: file.name, url: file_url });
        }
      }

      const response = await base44.functions.invoke('sendEventUpdate', {
        eventId: eventId,
        updateTitle: updateData.title,
        updateMessage: updateData.message,
        attachments: attachmentUrls
      });

      if (response.data.success) {
        const textMessage = `📢 ${updateData.title}\n\n${event.name}\n\n${updateData.message}\n\n🔗 View Event: ${event.qr_code_data}\n\nPowered by Eventpix QR`;

        alert(`✅ Update sent successfully!\n\n📧 Emails sent: ${response.data.emailsSent}\n❌ Failed: ${response.data.emailsFailed}\n👥 Total recipients: ${response.data.totalRecipients}`);

        const shouldCopyText = window.confirm("Would you like to copy a text message version to send via SMS/messaging apps?");

        if (shouldCopyText) {
          navigator.clipboard.writeText(textMessage);
          alert("Text message copied to clipboard! You can now paste it into any messaging app.");
        }

        setShowUpdateDialog(false);
        setUpdateData({ title: "", message: "", attachments: [] });
        setUpdateAttachmentFiles([]);
        await loadData();
      } else {
        throw new Error(response.data.error || "Failed to send update");
      }
    } catch (error) {
      console.error("Error sending update:", error);
      alert(`Failed to send update: ${error.message}`);
    }
    setSendingUpdate(false);
  };

  const handleBulkTicketFileUpload = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      setBulkTicketData(prev => ({ ...prev, ticketList: text }));
      alert(`✅ File loaded successfully!\n\nFound ${text.split('\n').filter(line => line.trim()).length} lines.`);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file. Please make sure it's a valid CSV or TXT file.");
    }
  };

  const handleIssueBulkTickets = async () => {
    if (!bulkTicketData.ticketList.trim()) {
      alert("Please enter ticket information or upload a file");
      return;
    }

    // FIXED: Filter out blank lines before processing
    const lines = bulkTicketData.ticketList
      .trim()
      .split('\n')
      .filter(line => line.trim()); // Remove blank/empty lines
    
    const tickets = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) { // At least Name and Email required, both non-empty
        tickets.push({
          name: parts[0],
          email: parts[1],
          phone: parts[2] || '',
          quantity: parseInt(parts[3]) || 1,
          tableNumber: parts[4] ? parseInt(parts[4]) : null,
          seatNumber: parts[5] ? parseInt(parts[5]) : null
        });
      }
    }

    if (tickets.length === 0) {
      alert("No valid tickets found. Please check the format.");
      return;
    }

    if (!window.confirm(`Issue ${tickets.length} ticket(s)? This will send confirmation emails to all attendees with email addresses.`)) {
      return;
    }

    setIssuingBulkTickets(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const results = [];
      const ticketCodes = [];

      for (const ticket of tickets) {
        try {
          const response = await base44.functions.invoke('issueManualTicket', {
            eventId: eventId,
            attendeeEmail: ticket.email,
            attendeeName: ticket.name,
            attendeePhone: ticket.phone,
            quantity: ticket.quantity,
            notes: bulkTicketData.notes,
            tableNumber: ticket.tableNumber,
            seatNumber: ticket.seatNumber
          });

          if (response.data.success) {
            successCount++;
            const seatingInfo = ticket.tableNumber ? ` (Table ${ticket.tableNumber}${ticket.seatNumber ? `, Seat ${ticket.seatNumber}` : ''})` : '';
            results.push({
              success: true,
              name: ticket.name,
              email: ticket.email,
              seating: seatingInfo,
              ticketCode: response.data.ticket.ticket_code
            });
            ticketCodes.push(`${ticket.name}: ${response.data.ticket.ticket_code}${seatingInfo}`);
          } else {
            failCount++;
            results.push({
              success: false,
              name: ticket.name,
              email: ticket.email,
              error: response.data.error || 'Unknown error'
            });
          }
        } catch (error) {
          failCount++;
          results.push({
            success: false,
            name: ticket.name,
            email: ticket.email,
            error: error.message
          });
        }
      }

      setBulkResults({ successCount, failCount, results, ticketCodes });
      setShowBulkResultsDialog(true);
      
      if (successCount > 0) {
        setShowBulkTicketDialog(false);
        setBulkTicketData({ ticketList: "", notes: "" });
        setBulkTicketFile(null);
        await loadData();
      }
    } catch (error) {
      console.error("Error issuing bulk tickets:", error);
      alert(`Failed to issue tickets: ${error.message}`);
    }
    setIssuingBulkTickets(false);
  };

  const handleResendTicketEmails = async () => {
    if (!window.confirm("Resend confirmation emails to all ticket holders with email addresses?\n\nThis will send emails to everyone who has a valid email on their ticket.")) {
      return;
    }

    try {
      const response = await base44.functions.invoke('resendTicketEmails', { eventId });
      
      if (response.data.success) {
        alert(`✅ Emails sent!\n\n📧 Sent: ${response.data.emailsSent}\n❌ Failed: ${response.data.emailsFailed}\n📱 No Email: ${response.data.totalTickets - response.data.emailsSent - response.data.emailsFailed}`);
      } else {
        throw new Error(response.data.error || "Failed to resend emails");
      }
    } catch (error) {
      console.error("Error resending ticket emails:", error);
      alert(`Failed to resend emails: ${error.message}`);
    }
  };

  const handleCopyResults = () => {
    const resultText = `Bulk Ticket Issuance Results\n\n✅ Successful: ${bulkResults.successCount}\n❌ Failed: ${bulkResults.failCount}\n\nDetails:\n${bulkResults.results.map(r => 
      r.success 
        ? `✅ ${r.name} (${r.email})${r.seating}\n   Ticket Code: ${r.ticketCode}`
        : `❌ ${r.name} (${r.email}) - ${r.error}`
    ).join('\n')}`;
    
    navigator.clipboard.writeText(resultText);
    alert("✅ Results copied to clipboard!");
  };

  const handleCopyTicketCodes = () => {
    const eventDate = event.expiration_date ? format(new Date(event.expiration_date), "EEEE, MMM d, yyyy 'at' h:mm a") : "Date TBD";
    
    // Create the complete welcome message with ticket codes
    const fullMessage = `🎫 Your Tickets for ${event.name}!

${event.description ? event.description + '\n\n' : ''}📅 When: ${eventDate}
${event.location_address ? '📍 Where: ' + event.location_address + '\n' : ''}
🔗 Event Link: ${event.qr_code_data}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TICKET CODES:

${bulkResults.ticketCodes.join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 IMPORTANT INSTRUCTIONS:
• Save your ticket code - you'll need it at check-in
• Tap the event link above to view photos and upload your own
• Arrive early for smooth check-in
• Show your ticket code (or this message) at the entrance

Questions? Reply to this message or contact the event host.

Powered by Eventpix QR - Scan. Smile. Capture. Share.`;

    navigator.clipboard.writeText(fullMessage);
    alert("✅ Complete message with all ticket codes copied!\n\nNow paste into your group text, WhatsApp, or individual messages. Recipients will have everything they need!");
  };

  const handleExportTicketCodes = () => {
    const csvContent = `Name,Email,Ticket Code,Seating\n${bulkResults.results
      .filter(r => r.success)
      .map(r => `"${r.name}","${r.email}","${r.ticketCode}","${r.seating}"`)
      .join('\n')}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name}_tickets_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    alert("✅ Ticket codes exported as CSV!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const pendingPhotos = photos.filter(p => !p.is_approved);
  const approvedPhotos = photos.filter(p => p.is_approved);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}
          className="mb-6 tap-target"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gallery
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <p className="text-gray-600">Manage your event settings and content</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5" />
                Event Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active-toggle" className="font-semibold">Event Active</Label>
                  <p className="text-sm text-gray-600">When inactive, guests cannot upload photos</p>
                </div>
                <Switch
                  id="active-toggle"
                  checked={event.is_active}
                  onCheckedChange={handleToggleActive}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleOpenEditDialog} className="w-full gap-2 tap-target" variant="outline">
                  <Edit className="w-4 h-4" />
                  Edit Event Details
                </Button>
                <Button onClick={() => navigate(createPageUrl(`GameManagement?eventId=${eventId}`))} className="w-full gap-2 tap-target" variant="outline">
                  <Gamepad2 className="w-4 h-4" />
                  Manage Event Games
                </Button>
                <Button onClick={() => setShowQR(true)} className="w-full gap-2 tap-target" variant="outline">
                  <QrCode className="w-4 h-4" />
                  View QR Code & Share
                </Button>
                <Button onClick={() => navigate(createPageUrl(`Analytics?eventId=${eventId}`))} className="w-full gap-2 tap-target" variant="outline">
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </Button>
                {event.num_tables && event.people_per_table && (
                  <Button onClick={() => navigate(createPageUrl(`SeatingChart?eventId=${eventId}`))} className="w-full gap-2 tap-target" variant="outline">
                    <Layout className="w-4 h-4" />
                    Manage Seating Chart
                  </Button>
                )}
                <Button onClick={handleDownloadSharePack} disabled={isDownloading} className="w-full gap-2 tap-target" variant="outline">
                  <Download className="w-4 h-4" />
                  {isDownloading ? "Generating..." : "Download All Photos"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Photos:</span>
                  <span className="font-semibold">{photos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Approval:</span>
                  <span className="font-semibold">{pendingPhotos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved:</span>
                  <span className="font-semibold">{approvedPhotos.length}</span>
                </div>
                {event.is_paid_event && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets Sold:</span>
                    <span className="font-semibold">{event.tickets_sold || 0}</span>
                  </div>
                )}
                {event.expiration_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-semibold">{format(new Date(event.expiration_date), "MMM d, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Feature Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="contest-toggle" className="font-semibold">Contest Mode</Label>
                  <p className="text-sm text-gray-600">Allow guests to vote for their favorite photos</p>
                </div>
                <Switch
                  id="contest-toggle"
                  checked={event.contest_mode}
                  onCheckedChange={(val) => handleToggleSetting('contest_mode', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="approval-toggle" className="font-semibold">Require Photo Approval</Label>
                  <p className="text-sm text-gray-600">Review photos before they appear in the gallery</p>
                </div>
                <Switch
                  id="approval-toggle"
                  checked={event.requires_approval}
                  onCheckedChange={(val) => handleToggleSetting('requires_approval', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-toggle" className="font-semibold">AI Photo Tagging</Label>
                  <p className="text-sm text-gray-600">Automatically categorize photos (selfies, groups, etc.)</p>
                </div>
                <Switch
                  id="ai-toggle"
                  checked={event.ai_tagging_enabled}
                  onCheckedChange={(val) => handleToggleSetting('ai_tagging_enabled', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-desc-toggle" className="font-semibold">Show AI Descriptions</Label>
                  <p className="text-sm text-gray-600">Display AI-generated photo descriptions</p>
                </div>
                <Switch
                  id="ai-desc-toggle"
                  checked={event.show_ai_descriptions}
                  onCheckedChange={(val) => handleToggleSetting('show_ai_descriptions', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="download-toggle" className="font-semibold">Allow Downloads</Label>
                  <p className="text-sm text-gray-600">Let guests download photos</p>
                </div>
                <Switch
                  id="download-toggle"
                  checked={event.allow_downloads}
                  onCheckedChange={(val) => handleToggleSetting('allow_downloads', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="post-event-toggle" className="font-semibold">72-Hour Upload Window</Label>
                  <p className="text-sm text-gray-600">Allow uploads for 72 hours after event ends</p>
                </div>
                <Switch
                  id="post-event-toggle"
                  checked={event.allow_post_event_uploads}
                  onCheckedChange={(val) => handleToggleSetting('allow_post_event_uploads', val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="countdown-toggle" className="font-semibold">Show Countdown Timer</Label>
                  <p className="text-sm text-gray-600">Display countdown on event page</p>
                </div>
                <Switch
                  id="countdown-toggle"
                  checked={event.show_countdown_timer !== false}
                  onCheckedChange={(val) => handleToggleSetting('show_countdown_timer', val)}
                />
              </div>
            </CardContent>
          </Card>

          <CoHostManager event={event} onUpdate={handleUpdateEvent} />

          {pendingPhotos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Pending Approval ({pendingPhotos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.image_url}
                        alt={photo.caption}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => handleApprovePhoto(photo.id)} className="bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePhoto(photo.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {event.is_paid_event && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Ticketing & Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate(createPageUrl(`TicketScanner?eventId=${eventId}`))} className="w-full gap-2 tap-target" variant="outline">
                  <QrCode className="w-4 h-4" />
                  Scan Tickets (Check-in)
                </Button>
                <Button onClick={handleOpenTicketManager} className="w-full gap-2 tap-target bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                  <Users className="w-4 h-4" />
                  Manage Issued Tickets ({issuedTickets.length})
                </Button>
                <Button onClick={() => setShowManualTicketDialog(true)} className="w-full gap-2 tap-target" variant="outline">
                  <Users className="w-4 h-4" />
                  Issue Manual Ticket
                </Button>
                <Button onClick={() => setShowBulkTicketDialog(true)} className="w-full gap-2 tap-target" variant="outline">
                  <Users className="w-4 h-4" />
                  Issue Bulk Tickets
                </Button>
                <Button onClick={handleResendTicketEmails} className="w-full gap-2 tap-target bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                  <Mail className="w-4 h-4" />
                  Resend All Confirmation Emails
                </Button>
                <Button onClick={() => setShowUpdateDialog(true)} className="w-full gap-2 tap-target" variant="outline">
                  <Bell className="w-4 h-4" />
                  Send Event Update
                </Button>
                <Button onClick={() => setShowRemindersDialog(true)} className="w-full gap-2 tap-target" variant="outline">
                  <Clock className="w-4 h-4" />
                  Send Event Reminders
                </Button>
                <Button onClick={() => setShowCancelDialog(true)} className="w-full gap-2 tap-target" variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  Send Cancellation Notice
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDeleteEvent} variant="destructive" className="w-full tap-target">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Event Permanently
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <QRCodeDisplay open={showQR} onOpenChange={setShowQR} event={event} />
      <OnboardingDialog
        open={showTeamOnboarding}
        onOpenChange={setShowTeamOnboarding}
        mode="team"
      />

      {/* Manual Ticket Dialog */}
      <Dialog open={showManualTicketDialog} onOpenChange={setShowManualTicketDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Manual Ticket</DialogTitle>
            <DialogDescription>
              Create a ticket for an attendee who paid outside the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Attendee Name *</Label>
              <Input
                value={manualTicketData.attendeeName}
                onChange={(e) => setManualTicketData(prev => ({ ...prev, attendeeName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">📱 Contact Information</p>
              <p className="text-xs text-blue-700">Provide at least one: email OR phone number</p>
            </div>
            
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={manualTicketData.attendeeEmail}
                onChange={(e) => setManualTicketData(prev => ({ ...prev, attendeeEmail: e.target.value }))}
                placeholder="john@example.com (optional if phone provided)"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={manualTicketData.attendeePhone}
                onChange={(e) => setManualTicketData(prev => ({ ...prev, attendeePhone: e.target.value }))}
                placeholder="+1 (555) 123-4567 (optional if email provided)"
              />
            </div>
            
            {event.num_tables && event.people_per_table && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">🪑 Seating Assignment (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Table Number</Label>
                    <Input
                      type="number"
                      min="1"
                      max={event.num_tables}
                      value={manualTicketData.tableNumber}
                      onChange={(e) => setManualTicketData(prev => ({ ...prev, tableNumber: e.target.value }))}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div>
                    <Label>Seat Number</Label>
                    <Input
                      type="number"
                      min="1"
                      max={event.people_per_table}
                      value={manualTicketData.seatNumber}
                      onChange={(e) => setManualTicketData(prev => ({ ...prev, seatNumber: e.target.value }))}
                      placeholder="e.g., 3"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">💡 Assign now or use Seating Chart later</p>
              </div>
            )}
            
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={manualTicketData.quantity}
                onChange={(e) => setManualTicketData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={manualTicketData.notes}
                onChange={(e) => setManualTicketData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment method, special dietary needs, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualTicketDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueManualTicket} disabled={issuingTicket}>
              {issuingTicket ? "Issuing..." : "Issue Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Name *</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Location Address</Label>
              <Input
                value={editFormData.location_address}
                onChange={(e) => setEditFormData(prev => ({ ...prev, location_address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={editFormData.expiration_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Theme Color</Label>
              <Input
                type="color"
                value={editFormData.theme_color}
                onChange={(e) => setEditFormData(prev => ({ ...prev, theme_color: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cover Image</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditCoverFile(e.target.files[0])}
                />
                <Button type="button" onClick={handleGenerateAICover} disabled={editFormData.generate_ai_cover} variant="outline">
                  {editFormData.generate_ai_cover ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Logo Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setEditLogoFile(e.target.files[0])}
              />
            </div>
            {event.is_paid_event && (
              <>
                <div>
                  <Label>Ticket Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.ticket_price}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, ticket_price: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ticket Description</Label>
                  <Textarea
                    value={editFormData.ticket_description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, ticket_description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Max Tickets (leave blank for unlimited)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editFormData.max_tickets}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, max_tickets: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number of Tables</Label>
                <Input
                  type="number"
                  min="1"
                  value={editFormData.num_tables}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, num_tables: e.target.value }))}
                />
              </div>
              <div>
                <Label>People Per Table</Label>
                <Input
                  type="number"
                  min="1"
                  value={editFormData.people_per_table}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, people_per_table: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Event Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Cancellation Notice</DialogTitle>
            <DialogDescription>
              This will notify all ticket holders that the event has been cancelled
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Cancellation Message</Label>
            <Textarea
              value={cancellationMessage}
              onChange={(e) => setCancellationMessage(e.target.value)}
              placeholder="We regret to inform you that this event has been cancelled due to..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSendCancellationNotice} disabled={sendingCancellation}>
              {sendingCancellation ? "Sending..." : "Send Cancellation Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Event Update</DialogTitle>
            <DialogDescription>
              Send an update notification to all ticket holders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Update Title</Label>
              <Input
                value={updateData.title}
                onChange={(e) => setUpdateData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Important Update: Schedule Change"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={updateData.message}
                onChange={(e) => setUpdateData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="We wanted to let you know that..."
                rows={5}
              />
            </div>
            <div>
              <Label>Attachments (optional)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setUpdateAttachmentFiles(Array.from(e.target.files))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendUpdate} disabled={sendingUpdate}>
              {sendingUpdate ? "Sending..." : "Send Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Ticket Dialog */}
      <Dialog open={showBulkTicketDialog} onOpenChange={setShowBulkTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Bulk Tickets</DialogTitle>
            <DialogDescription>
              Upload a CSV/TXT file or paste attendee information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File Upload Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">📁 Upload CSV or TXT File</p>
              </div>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setBulkTicketFile(file);
                    handleBulkTicketFileUpload(file);
                  }
                }}
                className="mb-2"
              />
              <p className="text-xs text-green-700">
                💡 Export from Excel/Google Sheets as CSV, or save as TXT file
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs text-gray-500 font-semibold">OR PASTE MANUALLY</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Format Instructions */}
            {event.num_tables && event.people_per_table ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-800 mb-2">📋 Format with Seating:</p>
                <p className="text-xs text-purple-700 mb-2">
                  Name, Email, Phone, Quantity, Table#, Seat#
                </p>
                <code className="text-xs bg-white p-2 rounded block text-purple-900 overflow-x-auto">
                  John Doe, john@example.com, +15551234567, 2, 5, 3<br/>
                  Jane Smith, jane@example.com, +15559876543, 1, 7, 1
                </code>
                <p className="text-xs text-purple-600 mt-2">💡 Leave Table/Seat blank if not assigned yet</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">📋 Format:</p>
                <p className="text-xs text-blue-700 mb-2">
                  Name, Email, Phone, Quantity
                </p>
                <code className="text-xs bg-white p-2 rounded block text-blue-900">
                  John Doe, john@example.com, +15551234567, 2<br/>
                  Jane Smith, jane@example.com, +15559876543, 1
                </code>
              </div>
            )}
            
            <div>
              <Label>Ticket List</Label>
              <Textarea
                value={bulkTicketData.ticketList}
                onChange={(e) => setBulkTicketData(prev => ({ ...prev, ticketList: e.target.value }))}
                placeholder={event.num_tables && event.people_per_table 
                  ? "John Doe, john@example.com, +15551234567, 2, 5, 3\nJane Smith, jane@example.com, +15559876543, 1, 7, 1"
                  : "John Doe, john@example.com, +15551234567, 2\nJane Smith, jane@example.com, +15559876543, 1"
                }
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-2">
                {event.num_tables && event.people_per_table 
                  ? "💡 Format: Name, Email, Phone (optional), Quantity, Table# (optional), Seat# (optional)"
                  : "💡 Format: Name, Email, Phone (optional), Quantity"
                }
              </p>
            </div>
            <div>
              <Label>Notes (optional - applies to all tickets)</Label>
              <Textarea
                value={bulkTicketData.notes}
                onChange={(e) => setBulkTicketData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Paid via cash, VIP section, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkTicketDialog(false);
              setBulkTicketFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleIssueBulkTickets} disabled={issuingBulkTickets}>
              {issuingBulkTickets ? "Issuing..." : "Issue Tickets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Results Dialog */}
      <Dialog open={showBulkResultsDialog} onOpenChange={setShowBulkResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Bulk Ticket Results</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-green-600">{bulkResults.successCount}</p>
                  <p className="text-sm text-green-700 mt-2">✅ Successful</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-red-600">{bulkResults.failCount}</p>
                  <p className="text-sm text-red-700 mt-2">❌ Failed</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={handleCopyResults} variant="outline" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All Results
              </Button>
              <Button onClick={handleCopyTicketCodes} variant="outline" className="gap-2" disabled={bulkResults.successCount === 0}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                Copy Ticket Codes
              </Button>
              <Button onClick={handleExportTicketCodes} variant="outline" className="gap-2" disabled={bulkResults.successCount === 0}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Detailed Results */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Detailed Results</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {bulkResults.results.map((result, index) => (
                  <Card key={index} className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {result.success ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <p className="font-semibold">{result.name}</p>
                          </div>
                          <p className="text-sm text-gray-600">{result.email}</p>
                          {result.success ? (
                            <>
                              {result.seating && <p className="text-sm text-gray-600">{result.seating}</p>}
                              <p className="text-sm font-mono bg-white px-2 py-1 rounded mt-2 inline-block">
                                🎫 {result.ticketCode}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-red-600 mt-1">Error: {result.error}</p>
                          )}
                        </div>
                        {result.success && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(result.ticketCode);
                              alert(`✅ Copied ticket code for ${result.name}`);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">📧 Email Confirmation Status:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>✅ Successful tickets: Confirmation emails sent automatically</li>
                <li>📱 Use "Copy Ticket Codes" to send via text/WhatsApp</li>
                <li>💾 Use "Export CSV" to save ticket codes for your records</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowBulkResultsDialog(false)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Manager Dialog */}
      <Dialog open={showTicketManagerDialog} onOpenChange={setShowTicketManagerDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Manage Issued Tickets</DialogTitle>
            <DialogDescription>
              View, export, or delete tickets for this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{issuedTickets.length}</p>
                  <p className="text-xs text-blue-700 mt-1">Total Tickets</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {issuedTickets.filter(t => t.status === 'purchased').length}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Not Redeemed</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {issuedTickets.filter(t => t.status === 'redeemed').length}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">Checked In</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {issuedTickets.reduce((sum, t) => sum + (t.quantity || 1), 0)}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">Total Seats</p>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-cyan-600">
                    {issuedTickets.filter(t => t.sms_sent).length}
                  </p>
                  <p className="text-xs text-cyan-700 mt-1">SMS Sent</p>
                </CardContent>
              </Card>
            </div>

            {/* SMS Filter */}
            <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-lg p-4">
              <Filter className="w-5 h-5 text-cyan-600" />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={smsFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setSmsFilter('all')}
                >
                  All ({issuedTickets.length})
                </Button>
                <Button
                  size="sm"
                  variant={smsFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setSmsFilter('pending')}
                  className={smsFilter === 'pending' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}
                >
                  Need SMS ({issuedTickets.filter(t => !t.sms_sent && t.attendee_phone).length})
                </Button>
                <Button
                  size="sm"
                  variant={smsFilter === 'sent' ? 'default' : 'outline'}
                  onClick={() => setSmsFilter('sent')}
                  className={smsFilter === 'sent' ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                >
                  ✓ SMS Sent ({issuedTickets.filter(t => t.sms_sent && t.attendee_phone).length})
                </Button>
              </div>
              {smsFilter !== 'all' && getFilteredTickets().filter(t => t.attendee_phone).length > 0 && (
                <Button
                  size="sm"
                  onClick={handleMarkAllSMSSent}
                  className="ml-auto gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Check className="w-4 h-4" />
                  Mark All as Sent ({getFilteredTickets().filter(t => t.attendee_phone).length})
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleCopyAllTicketsMessage} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" disabled={getFilteredTickets().length === 0}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Full Message for Text ({getFilteredTickets().length} tickets)
              </Button>
              <Button onClick={handleExportTickets} variant="outline" className="gap-2" disabled={issuedTickets.length === 0}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button onClick={handleResetTicketCount} variant="outline" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recalculate Count
              </Button>
              <Button onClick={handleDeleteAllTickets} variant="destructive" className="gap-2" disabled={issuedTickets.length === 0 || deletingTickets}>
                <Trash2 className="w-4 h-4" />
                {deletingTickets ? "Deleting..." : "Delete All"}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-bold mb-3">📱 SMS Tracking Workflow:</p>
              <div className="space-y-2 text-xs text-blue-800">
                <p>🎯 <strong>How to use this feature:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>Filter "Need SMS"</strong> to see who you haven't texted yet</li>
                  <li><strong>Copy message</strong> and send via WhatsApp/SMS to individuals or groups</li>
                  <li><strong>Click the ✓ checkmark</strong> next to each ticket after you send it</li>
                  <li><strong>"Mark All as Sent"</strong> button appears when filtering - bulk mark visible tickets</li>
                  <li>Filter "SMS Sent" to see who you've already contacted</li>
                </ul>
                <p className="mt-3 bg-white rounded px-2 py-1 font-semibold">
                  💡 This helps you track progress and ensure everyone gets their ticket info!
                </p>
              </div>
            </div>

            {/* Ticket List */}
            <div>
              <h3 className="font-semibold text-lg mb-3">
                {smsFilter === 'all' && `All Tickets (${getFilteredTickets().length})`}
                {smsFilter === 'pending' && `Need SMS (${getFilteredTickets().filter(t => t.attendee_phone).length})`}
                {smsFilter === 'sent' && `SMS Sent (${getFilteredTickets().filter(t => t.attendee_phone).length})`}
              </h3>
              {loadingTickets ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading tickets...</p>
                </div>
              ) : getFilteredTickets().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">
                    {smsFilter === 'pending' ? '🎉 All SMS messages sent!' : 
                     smsFilter === 'sent' ? 'No tickets marked as sent yet' : 
                     'No tickets issued yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {getFilteredTickets().map((ticket) => (
                    <Card key={ticket.id} className={
                      ticket.status === 'redeemed' 
                        ? 'bg-green-50 border-green-200' 
                        : ticket.sms_sent && ticket.attendee_phone
                        ? 'bg-cyan-50 border-cyan-200'
                        : !ticket.sms_sent && ticket.attendee_phone && smsFilter === 'pending'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white'
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <p className="font-semibold text-lg">{ticket.attendee_name}</p>
                              {ticket.status === 'redeemed' && (
                                <Badge className="bg-green-600 text-white">✓ Checked In</Badge>
                              )}
                              {ticket.sms_sent && ticket.attendee_phone && (
                                <Badge className="bg-cyan-600 text-white">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  SMS Sent
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">Email:</span> {ticket.attendee_email || 'N/A'}
                              </p>
                              {ticket.attendee_phone ? (
                                <p className="text-gray-600">
                                  <span className="font-medium">Phone:</span> {ticket.attendee_phone}
                                </p>
                              ) : (
                                <p className="text-gray-600 text-orange-600">
                                  <span className="font-medium">Phone:</span> Not provided
                                </p>
                              )}
                              <p className="text-gray-600">
                                <span className="font-medium">Quantity:</span> {ticket.quantity} ticket(s)
                              </p>
                              {ticket.table_number && (
                                <p className="text-gray-600">
                                  <span className="font-medium">Seating:</span> Table {ticket.table_number}
                                  {ticket.seat_number && `, Seat ${ticket.seat_number}`}
                                </p>
                              )}
                              <p className="text-gray-600 col-span-2">
                                <span className="font-medium">Issued:</span> {format(new Date(ticket.created_date), 'MMM d, yyyy h:mm a')}
                              </p>
                              {ticket.sms_sent_at && (
                                <p className="text-gray-600 col-span-2 text-xs text-cyan-700">
                                  <span className="font-medium">SMS Marked:</span> {format(new Date(ticket.sms_sent_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {ticket.ticket_code}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(ticket.ticket_code);
                                  alert(`✅ Copied: ${ticket.ticket_code}`);
                                }}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {ticket.attendee_phone && (
                              <Button
                                size="sm"
                                variant={ticket.sms_sent ? "outline" : "default"}
                                onClick={() => handleToggleSMS(ticket.id, ticket.sms_sent)}
                                className={ticket.sms_sent ? 'bg-cyan-100 border-cyan-400 text-cyan-700 hover:bg-cyan-200' : 'bg-cyan-600 text-white hover:bg-cyan-700'}
                                title={ticket.sms_sent ? "Mark as SMS NOT Sent" : "Mark as SMS Sent"}
                              >
                                {ticket.sms_sent ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <MessageSquare className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteSingleTicket(ticket.id, ticket.quantity)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">💡 Ticket Management Tips:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>✅ <strong>Export CSV:</strong> Save all ticket data for Excel/records</li>
                <li>🔄 <strong>Recalculate Count:</strong> Fixes mismatch between counter and actual tickets</li>
                <li>📱 <strong>SMS Checkmark:</strong> Mark when you've sent ticket info via text</li>
                <li>🗑️ <strong>Delete Single:</strong> Remove one attendee's ticket</li>
                <li>⚠️ <strong>Delete All:</strong> Reset event and start over (requires confirmation)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowTicketManagerDialog(false)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminders Dialog */}
      <Dialog open={showRemindersDialog} onOpenChange={setShowRemindersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Event Reminders</DialogTitle>
            <DialogDescription>
              Choose which reminder to send to all ticket holders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={() => handleSendReminder('day_before')}
              disabled={sendingReminder}
              className="w-full"
              variant="outline"
            >
              Send Day Before Reminder
            </Button>
            <Button
              onClick={() => handleSendReminder('4_hours_before')}
              disabled={sendingReminder}
              className="w-full"
              variant="outline"
            >
              Send 4 Hours Before Reminder
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemindersDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}