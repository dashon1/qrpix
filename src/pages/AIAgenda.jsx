import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Calendar, Clock, Download, Plus, Trash2, Edit, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function AIAgenda() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [agenda, setAgenda] = useState(null);
  const [editingAgenda, setEditingAgenda] = useState(null);
  
  const [formData, setFormData] = useState({
    duration_hours: '',
    guest_count: '',
    event_goals: '',
    key_activities: '',
    special_requirements: ''
  });

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      const isHost = foundEvent && (foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email));
      
      if (!foundEvent || !isHost) {
        navigate(createPageUrl('Home'));
        return;
      }
      
      setEvent(foundEvent);
      
      // Try to load existing agenda for this event
      const plans = await base44.entities.EventPlan.filter({ event_id: eventId, plan_type: 'agenda' });
      if (plans.length > 0) {
        setAgenda(plans[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleGenerateAgenda = async () => {
    if (!formData.duration_hours || !formData.guest_count) {
      alert('Please fill in duration and guest count at minimum');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `You are an expert event planner. Generate a detailed, optimized event agenda for the following event:

Event Name: ${event.name}
Event Description: ${event.description || 'Not provided'}
Event Location: ${event.location_address || 'Not provided'}
Event Duration: ${formData.duration_hours} hours
Expected Guests: ${formData.guest_count}
Event Goals: ${formData.event_goals || 'Create a memorable experience'}
Key Activities: ${formData.key_activities || 'Standard event activities'}
Special Requirements: ${formData.special_requirements || 'None'}

Please create a comprehensive agenda that includes:
1. Optimal timing for each segment
2. Activity flow and transitions
3. Strategic break placements (coffee, lunch, restroom breaks)
4. Setup and preparation reminders
5. Speaker/performance slots if applicable
6. Networking opportunities
7. Photo opportunities
8. Closing activities

Format the response as a detailed timeline with specific times, activities, and brief notes for each segment. Make it professional and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const agendaData = {
        event_id: eventId,
        plan_type: 'agenda',
        prompt: JSON.stringify(formData),
        ai_response: result,
        is_favorite: false
      };

      if (agenda) {
        await base44.entities.EventPlan.update(agenda.id, agendaData);
      } else {
        await base44.entities.EventPlan.create(agendaData);
      }

      await loadData();
      alert('✨ AI Agenda generated successfully!');
    } catch (error) {
      console.error('Error generating agenda:', error);
      alert('Failed to generate agenda. Please try again.');
    }
    setGenerating(false);
  };

  const handleSaveEdit = async () => {
    try {
      await base44.entities.EventPlan.update(agenda.id, {
        ai_response: editingAgenda
      });
      await loadData();
      setEditingAgenda(null);
      alert('Agenda saved successfully!');
    } catch (error) {
      console.error('Error saving agenda:', error);
      alert('Failed to save agenda');
    }
  };

  const handleExportAgenda = () => {
    const agendaText = agenda.ai_response;
    const blob = new Blob([agendaText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name}-Agenda-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAgenda = async () => {
    if (window.confirm('Delete this agenda? This cannot be undone.')) {
      try {
        await base44.entities.EventPlan.delete(agenda.id);
        setAgenda(null);
      } catch (error) {
        console.error('Error deleting agenda:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Event
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            <Sparkles className="w-8 h-8 text-purple-600" />
            AI Event Agenda Generator
          </h1>
          <p className="text-gray-600">Create a professional, optimized event schedule with AI assistance</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Event Name</Label>
                <Input value={event.name} disabled className="bg-gray-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Duration (hours) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    placeholder="e.g., 4"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">Expected Guests *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.guest_count}
                    onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Event Goals</Label>
                <Textarea
                  value={formData.event_goals}
                  onChange={(e) => setFormData({ ...formData, event_goals: e.target.value })}
                  placeholder="e.g., Maximize networking, celebrate achievements, product launch..."
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Key Activities</Label>
                <Textarea
                  value={formData.key_activities}
                  onChange={(e) => setFormData({ ...formData, key_activities: e.target.value })}
                  placeholder="e.g., Keynote speech, awards ceremony, dinner, dancing..."
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Special Requirements</Label>
                <Textarea
                  value={formData.special_requirements}
                  onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                  placeholder="e.g., Dietary restrictions, accessibility needs, AV setup..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleGenerateAgenda}
                disabled={generating}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {agenda ? 'Regenerate Agenda' : 'Generate AI Agenda'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Agenda Display */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Generated Agenda
                </span>
                {agenda && (
                  <div className="flex gap-2">
                    {editingAgenda ? (
                      <>
                        <Button size="sm" onClick={handleSaveEdit} className="gap-2">
                          <Save className="w-3 h-3" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingAgenda(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingAgenda(agenda.ai_response)} className="gap-2">
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleExportAgenda} className="gap-2">
                          <Download className="w-3 h-3" />
                          Export
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleDeleteAgenda} className="text-red-600 gap-2">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!agenda && !generating ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agenda Generated Yet</h3>
                  <p className="text-gray-600 text-sm">Fill in the event details and click "Generate AI Agenda" to create your professional event schedule</p>
                </div>
              ) : editingAgenda !== null ? (
                <Textarea
                  value={editingAgenda}
                  onChange={(e) => setEditingAgenda(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
              ) : agenda ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap font-mono text-sm max-h-[600px] overflow-y-auto">
                    {agenda.ai_response}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {agenda && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Pro Tips for Your Agenda</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• <strong>Review and Customize:</strong> Use the Edit button to adjust timings based on your venue's specific needs</li>
                      <li>• <strong>Share with Team:</strong> Export and share the agenda with co-hosts, vendors, and key staff</li>
                      <li>• <strong>Build in Buffer:</strong> Keep some flexibility for unexpected delays or guest engagement</li>
                      <li>• <strong>Print Physical Copies:</strong> Have printed agendas available at registration and key locations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}