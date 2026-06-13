import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Save, Download, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SeatingChart() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assignData, setAssignData] = useState({ table: '', seat: '' });

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId') || urlParams.get('eventid');

  useEffect(() => {
    if (eventId) {
      loadData();
    } else {
      console.error('[SeatingChart] No eventId provided');
      navigate(createPageUrl('Home'));
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      console.log('[SeatingChart] Loading data for eventId:', eventId);
      
      const user = await base44.auth.me();
      console.log('[SeatingChart] Current user:', user.email);
      
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      console.log('[SeatingChart] Found event:', foundEvent?.name);
      console.log('[SeatingChart] Event host:', foundEvent?.host_email);
      console.log('[SeatingChart] Event co-hosts:', foundEvent?.co_hosts);
      
      if (!foundEvent) {
        console.error('[SeatingChart] Event not found');
        alert('Event not found');
        navigate(createPageUrl('Home'));
        return;
      }
      
      const isHost = foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email);
      console.log('[SeatingChart] Is user a host?', isHost);
      
      if (!isHost) {
        console.error('[SeatingChart] User is not authorized to manage this event');
        alert('You do not have permission to manage this event');
        navigate(createPageUrl('Home'));
        return;
      }
      
      setEvent(foundEvent);
      
      const allTickets = await base44.entities.Ticket.filter({ event_id: eventId });
      console.log('[SeatingChart] Loaded tickets:', allTickets.length);
      setTickets(allTickets);
    } catch (error) {
      console.error('[SeatingChart] Error loading data:', error);
      alert('Error loading seating chart: ' + error.message);
    }
    setLoading(false);
  };

  const handleAssignSeat = async () => {
    if (!assignData.table || !assignData.seat) {
      alert('Please select both table and seat numbers');
      return;
    }

    try {
      await base44.entities.Ticket.update(selectedTicket.id, {
        table_number: parseInt(assignData.table),
        seat_number: parseInt(assignData.seat)
      });

      setShowAssignDialog(false);
      setSelectedTicket(null);
      setAssignData({ table: '', seat: '' });
      await loadData();
    } catch (error) {
      console.error('Error assigning seat:', error);
      alert('Failed to assign seat');
    }
  };

  const handleUnassign = async (ticketId) => {
    if (window.confirm('Remove this seating assignment?')) {
      try {
        await base44.entities.Ticket.update(ticketId, {
          table_number: null,
          seat_number: null
        });
        await loadData();
      } catch (error) {
        console.error('Error unassigning seat:', error);
      }
    }
  };

  const openAssignDialog = (ticket) => {
    setSelectedTicket(ticket);
    setAssignData({
      table: ticket.table_number?.toString() || '',
      seat: ticket.seat_number?.toString() || ''
    });
    setShowAssignDialog(true);
  };

  const getTableOccupancy = (tableNum) => {
    return tickets.filter(t => t.table_number === tableNum).length;
  };

  const exportSeatingChart = () => {
    const seatingData = {
      event: event.name,
      tables: event.num_tables,
      people_per_table: event.people_per_table,
      assignments: tickets
        .filter(t => t.table_number)
        .map(t => ({
          name: t.attendee_name,
          email: t.attendee_email,
          table: t.table_number,
          seat: t.seat_number
        }))
    };

    const blob = new Blob([JSON.stringify(seatingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name}-seating-chart.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load event data.</p>
          <Button onClick={() => navigate(createPageUrl('Home'))}>
            Go to My Events
          </Button>
        </div>
      </div>
    );
  }

  if (!event.num_tables || !event.people_per_table) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Seating Management Not Configured</h2>
          <p className="text-gray-600 mb-6">
            Please configure the number of tables and people per table in your event settings first.
          </p>
          <Button onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}>
            Go to Event Settings
          </Button>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter(t => 
    t.attendee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.attendee_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assignedTickets = filteredTickets.filter(t => t.table_number);
  const unassignedTickets = filteredTickets.filter(t => !t.table_number);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Seating Chart
              </h1>
              <p className="text-gray-600">{event.name}</p>
            </div>
          </div>
          <Button onClick={exportSeatingChart} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">{event.num_tables}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>People Per Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-pink-600">{event.people_per_table}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">
                {event.num_tables * event.people_per_table}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Tables Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                  {Array.from({ length: event.num_tables }, (_, i) => i + 1).map(tableNum => {
                    const occupancy = getTableOccupancy(tableNum);
                    const percentage = (occupancy / event.people_per_table) * 100;
                    
                    return (
                      <motion.div
                        key={tableNum}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedTable(selectedTable === tableNum ? null : tableNum)}
                        className={`cursor-pointer relative p-4 rounded-lg border-2 transition-all ${
                          selectedTable === tableNum
                            ? 'border-purple-600 bg-purple-50'
                            : percentage === 100
                            ? 'border-green-500 bg-green-50'
                            : percentage > 0
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold mb-1">{tableNum}</div>
                          <div className="text-xs text-gray-600">{occupancy}/{event.people_per_table}</div>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${
                              percentage === 100 ? 'bg-green-500' : percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedTable && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Table {selectedTable} - Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tickets
                      .filter(t => t.table_number === selectedTable)
                      .map(ticket => (
                        <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{ticket.attendee_name}</p>
                            <p className="text-sm text-gray-600">Seat {ticket.seat_number}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleUnassign(ticket.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    {getTableOccupancy(selectedTable) === 0 && (
                      <p className="text-center text-gray-500 py-4">No assignments yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Attendees</span>
                  <span className="text-sm font-normal text-gray-500">
                    {assignedTickets.length}/{tickets.length}
                  </span>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search attendees..."
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {unassignedTickets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">Unassigned ({unassignedTickets.length})</h3>
                      <div className="space-y-2">
                        {unassignedTickets.map(ticket => (
                          <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{ticket.attendee_name}</p>
                                <p className="text-xs text-gray-600">{ticket.attendee_email}</p>
                              </div>
                              <Button size="sm" onClick={() => openAssignDialog(ticket)}>
                                Assign
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignedTickets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">Assigned ({assignedTickets.length})</h3>
                      <div className="space-y-2">
                        {assignedTickets.map(ticket => (
                          <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{ticket.attendee_name}</p>
                                <p className="text-xs text-gray-600">
                                  Table {ticket.table_number}, Seat {ticket.seat_number}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => openAssignDialog(ticket)}>
                                Edit
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Seating for {selectedTicket?.attendee_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Table Number</Label>
              <Select value={assignData.table} onValueChange={(value) => setAssignData({ ...assignData, table: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: event.num_tables }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      Table {num} ({getTableOccupancy(num)}/{event.people_per_table})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Seat Number</Label>
              <Select value={assignData.seat} onValueChange={(value) => setAssignData({ ...assignData, seat: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select seat" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: event.people_per_table }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      Seat {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignSeat}>
              <Save className="w-4 h-4 mr-2" />
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}