import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Scan, ArrowLeft, Camera, Users, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function TicketScanner() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketCode, setTicketCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId') || urlParams.get('eventid');

  useEffect(() => {
    if (eventId) {
      loadData();
      
      const refreshInterval = setInterval(() => {
        loadData();
      }, 10000);
      
      return () => {
        clearInterval(refreshInterval);
        stopCamera();
      };
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      console.log('[Ticket Scanner] Loading data for eventId:', eventId);
      
      const user = await base44.auth.me();
      console.log('[Ticket Scanner] Current user:', user.email);
      
      const events = await base44.entities.Event.list();
      console.log('[Ticket Scanner] Total events found:', events.length);
      
      const foundEvent = events.find(e => e.id === eventId);
      console.log('[Ticket Scanner] Event match found:', foundEvent ? foundEvent.name : 'NOT FOUND');

      if (!foundEvent) {
        console.error('[Ticket Scanner] Event not found with ID:', eventId);
        alert('Event not found. Please check the event ID.');
        navigate(createPageUrl('Home'));
        return;
      }

      const isHost = foundEvent && (
        foundEvent.host_email === user.email || 
        foundEvent.co_hosts?.includes(user.email)
      );

      if (!isHost) {
        console.error('[Ticket Scanner] User is not host. Host email:', foundEvent.host_email);
        alert('You do not have permission to access this scanner.');
        navigate(createPageUrl('Home'));
        return;
      }

      setEvent(foundEvent);

      console.log('[Ticket Scanner] Fetching tickets for event:', eventId);
      
      let eventTickets = await base44.entities.Ticket.filter({ event_id: eventId }, '-created_date');
      console.log('[Ticket Scanner] Tickets found (filter):', eventTickets.length);
      
      if (eventTickets.length === 0) {
        console.log('[Ticket Scanner] No tickets found with filter, trying list all...');
        const allTickets = await base44.entities.Ticket.list();
        eventTickets = allTickets.filter(t => t.event_id === eventId);
        console.log('[Ticket Scanner] Tickets found (manual filter):', eventTickets.length);
        console.log('[Ticket Scanner] All tickets in database:', allTickets.length);
        
        if (allTickets.length > 0 && eventTickets.length === 0) {
          console.warn('[Ticket Scanner] WARNING: Tickets exist but none match eventId:', eventId);
          console.warn('[Ticket Scanner] Available event IDs in tickets:', [...new Set(allTickets.map(t => t.event_id))]);
        }
      }
      
      if (eventTickets.length > 0) {
        console.log('[Ticket Scanner] Ticket details:', eventTickets.map(t => ({
          id: t.id,
          code: t.ticket_code,
          name: t.attendee_name,
          status: t.status,
          event_id: t.event_id
        })));
      }
      
      setTickets(eventTickets);
    } catch (error) {
      console.error('[Ticket Scanner] Error loading scanner data:', error);
      alert(`Error loading tickets: ${error.message}`);
    }
    setLoading(false);
  };

  const startCamera = async () => {
    console.log('[Camera] Starting camera...');
    setCameraLoading(true);
    setCameraError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use Chrome, Safari, or Edge.');
      }

      console.log('[Camera] Requesting camera permissions...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('[Camera] Stream obtained:', stream.id);
      
      if (!videoRef.current) {
        console.error('[Camera] Video element not found!');
        throw new Error('Video element not ready');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      console.log('[Camera] Stream assigned to video element');
      
      // Force video to load and play
      try {
        await videoRef.current.play();
        console.log('[Camera] Video playing successfully');
        setCameraActive(true);
        setCameraLoading(false);
      } catch (playError) {
        console.error('[Camera] Play error:', playError);
        throw new Error('Could not start video playback: ' + playError.message);
      }
      
    } catch (error) {
      console.error('[Camera] Error:', error);
      
      stopCamera();
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application. Please close other apps using the camera.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setCameraError(errorMessage);
      setCameraActive(false);
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    console.log('[Camera] Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[Camera] Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  const handleScanTicket = async (code) => {
    if (!code) return;

    setScanning(true);
    try {
      const matchingTickets = tickets.filter(t => t.ticket_code === code.trim());
      
      if (matchingTickets.length === 0) {
        setScanResult({
          success: false,
          message: 'Invalid ticket code',
          ticket: null
        });
        setScanning(false);
        return;
      }

      const ticket = matchingTickets[0];

      if (ticket.status === 'redeemed') {
        setScanResult({
          success: false,
          message: 'Ticket already redeemed',
          ticket: ticket,
          redeemedAt: ticket.redeemed_at
        });
        setScanning(false);
        return;
      }

      await base44.entities.Ticket.update(ticket.id, {
        status: 'redeemed',
        redeemed_at: new Date().toISOString()
      });

      setScanResult({
        success: true,
        message: 'Ticket validated successfully!',
        ticket: { ...ticket, status: 'redeemed', redeemed_at: new Date().toISOString() }
      });

      await loadData();
    } catch (error) {
      console.error('Error scanning ticket:', error);
      setScanResult({
        success: false,
        message: 'Error validating ticket',
        ticket: null
      });
    }
    setScanning(false);
    setTicketCode('');
  };

  const handleManualEntry = (e) => {
    e.preventDefault();
    handleScanTicket(ticketCode);
  };

  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null);
        inputRef.current?.focus();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="w-16 h-16 text-red-600" />
        <h2 className="text-2xl font-bold">No Event ID</h2>
        <p className="text-gray-600">Please access the scanner from an event's Manage page.</p>
        <Button onClick={() => navigate(createPageUrl('Home'))}>
          Go to Home
        </Button>
      </div>
    );
  }

  const totalTickets = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
  const redeemedTickets = tickets.filter(t => t.status === 'redeemed').reduce((sum, t) => sum + (t.quantity || 1), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Event
        </Button>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600">Total Sold</p>
              <p className="text-3xl font-bold">{totalTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-600">Redeemed</p>
              <p className="text-3xl font-bold">{redeemedTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Camera className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold">{totalTickets - redeemedTickets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Debug Info */}
        <Card className="mb-6 bg-yellow-50 border-yellow-300">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">🔍 Debug Info:</p>
            <div className="text-xs text-yellow-700 space-y-1 font-mono">
              <p>Event ID: {eventId}</p>
              <p>Event Name: {event?.name || 'Loading...'}</p>
              <p>Tickets Found: {tickets.length}</p>
              <p className="text-[10px] mt-2">Open browser console (F12) for detailed logs</p>
              <Button 
                onClick={loadData} 
                size="sm" 
                variant="outline" 
                className="mt-2 text-xs"
              >
                🔄 Refresh Tickets Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-2 border-purple-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Scan className="w-6 h-6" />
              Ticket Scanner - {event.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Simplified approach - camera feature removed for reliability */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-900 text-lg mb-2">📱 Best Practice for Fast Check-In</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    For the most reliable and fastest ticket validation, use <strong>manual entry</strong>:
                  </p>
                  <ol className="list-decimal list-inside text-blue-700 text-sm space-y-2 ml-2">
                    <li>Guest shows their email or text with the ticket code</li>
                    <li>Type or paste the code in the field below (e.g., <code className="bg-white px-1 rounded">EPQ-1762941803603-79FB0SF</code>)</li>
                    <li>Click <strong>Validate</strong> - instant verification! ✅</li>
                  </ol>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-600 mb-2">💡 <strong>Pro tip:</strong> Each ticket email contains the code clearly labeled. It's faster to type/paste than to scan!</p>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div>
              <form onSubmit={handleManualEntry}>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700 mb-2 block">
                      Enter Ticket Code:
                    </span>
                    <div className="flex gap-3">
                      <Input
                        ref={inputRef}
                        type="text"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                        placeholder="EPQ-1762941803603-79FB0SF"
                        className="text-lg h-16 font-mono flex-1 text-center"
                        autoFocus
                      />
                      <Button 
                        type="submit" 
                        disabled={scanning || !ticketCode}
                        className="h-16 px-8 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {scanning ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Checking...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Validate
                          </>
                        )}
                      </Button>
                    </div>
                  </label>
                  
                  <div className="text-center text-xs text-gray-500">
                    The ticket code is in the confirmation email sent to the guest
                  </div>
                </div>
              </form>
            </div>

            {/* Scan Result */}
            <AnimatePresence>
              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-6 rounded-xl mt-6 ${
                    scanResult.success 
                      ? 'bg-green-50 border-2 border-green-500' 
                      : 'bg-red-50 border-2 border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {scanResult.success ? (
                      <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-2xl font-bold mb-3 ${
                        scanResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {scanResult.message}
                      </p>
                      {scanResult.ticket && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Name:</span>
                              <p className="font-semibold">{scanResult.ticket.attendee_name}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <p className="font-semibold">{scanResult.ticket.quantity} ticket(s)</p>
                            </div>
                          </div>
                          {scanResult.ticket.table_number && (
                            <div className="bg-white/50 rounded p-2 text-sm">
                              <span className="text-gray-600">Seating:</span>
                              <p className="font-semibold">
                                🪑 Table {scanResult.ticket.table_number}
                                {scanResult.ticket.seat_number && `, Seat ${scanResult.ticket.seat_number}`}
                              </p>
                            </div>
                          )}
                          {scanResult.redeemedAt && (
                            <p className="text-sm text-red-700 bg-white/50 rounded p-2">
                              <strong>Already checked in:</strong> {format(new Date(scanResult.redeemedAt), 'PPP p')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">No tickets issued yet</p>
                <p className="text-sm text-gray-400 mb-4">Issue manual tickets from the Manage Event page</p>
                <Button
                  onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
                  variant="outline"
                >
                  Go to Manage Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{ticket.attendee_name}</p>
                      <p className="text-sm text-gray-600 font-mono">{ticket.ticket_code}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>Qty: {ticket.quantity}</span>
                        {ticket.table_number && (
                          <span>
                            🪑 Table {ticket.table_number}{ticket.seat_number && `, Seat ${ticket.seat_number}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={
                      ticket.status === 'redeemed' 
                        ? 'bg-green-100 text-green-800 text-sm' 
                        : 'bg-yellow-100 text-yellow-800 text-sm'
                    }>
                      {ticket.status === 'redeemed' ? '✓ Checked In' : 'Not Checked In'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}