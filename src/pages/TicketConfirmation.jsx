import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Mail, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import Confetti from '../components/ui/Confetti';

export default function TicketConfirmation() {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      loadTicketData();
      setConfettiTrigger(Date.now());
    }
  }, [sessionId]);

  const loadTicketData = async () => {
    try {
      const user = await base44.auth.me();
      
      // Get user's tickets
      const tickets = await base44.entities.Ticket.filter({ 
        attendee_email: user.email 
      }, '-created_date', 1);
      
      if (tickets.length > 0) {
        const latestTicket = tickets[0];
        setTicket(latestTicket);
        
        // Get event details
        const events = await base44.entities.Event.filter({ id: latestTicket.event_id });
        if (events.length > 0) {
          setEvent(events[0]);
        }
      }
    } catch (error) {
      console.error('Error loading ticket data:', error);
    }
    setLoading(false);
  };

  const handleDownloadTicket = () => {
    // Create a simple ticket text file
    const ticketText = `
EVENT TICKET
━━━━━━━━━━━━━━━━━━━━━━━━

${event.name}
${event.location_address || 'Location TBA'}

Ticket Code: ${ticket.ticket_code}
Attendee: ${ticket.attendee_name}
Quantity: ${ticket.quantity} ticket(s)
Price Paid: $${ticket.price_paid}

━━━━━━━━━━━━━━━━━━━━━━━━
Present this code at the event entrance.

Powered by Eventpix QR
    `.trim();

    const blob = new Blob([ticketText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticket_code}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!ticket || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Ticket Found</h2>
            <p className="text-gray-600 mb-6">We couldn't find your ticket information.</p>
            <Button onClick={() => navigate(createPageUrl('Home'))}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Confetti trigger={confettiTrigger} />
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-2xl border-2 border-purple-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <CheckCircle className="w-20 h-20 mx-auto mb-4" />
              </motion.div>
              <CardTitle className="text-3xl">Ticket Purchase Successful!</CardTitle>
              <p className="text-green-100 mt-2">Your ticket has been sent to your email</p>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold mb-4 text-center">{event.name}</h3>
                
                {event.location_address && (
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                    <p className="text-gray-700">{event.location_address}</p>
                  </div>
                )}
                
                <div className="bg-white rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-600 mb-1">Your Ticket Code</p>
                  <p className="text-3xl font-bold text-purple-600 tracking-wider font-mono">
                    {ticket.ticket_code}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Attendee</p>
                    <p className="font-semibold">{ticket.attendee_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-semibold">{ticket.quantity} ticket(s)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="font-semibold">${ticket.price_paid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold text-green-600">Purchased</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900">Check Your Email</p>
                    <p className="text-sm text-blue-700">
                      A confirmation email with your ticket details has been sent to <strong>{ticket.attendee_email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleDownloadTicket}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Ticket
                </Button>
                <Button 
                  onClick={() => navigate(createPageUrl(`EventGallery?eventId=${event.id}`))}
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Calendar className="w-4 h-4" />
                  View Event
                </Button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                Present your ticket code at the event entrance for admission
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}