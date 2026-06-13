import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Mail, Clock, Calendar, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const FOLLOWUP_TEMPLATES = {
  thank_you: {
    subject: 'Thank You for Attending {event_name}!',
    body: `Dear {guest_name},

Thank you so much for attending {event_name}! Your presence made our event truly special.

We hope you had a wonderful time and created great memories. Don't forget to check out all the photos from the event in our gallery!

View Event Photos: {event_url}

Looking forward to seeing you at our next event!

Best regards,
{host_name}`
  },
  feedback_request: {
    subject: 'We\'d Love Your Feedback on {event_name}',
    body: `Hi {guest_name},

Thank you for being part of {event_name}! We'd love to hear about your experience.

Your feedback helps us create even better events in the future. Please take a moment to share your thoughts:

Leave a Review: {event_url}

Thank you for your time!

Best regards,
{host_name}`
  },
  event_highlights: {
    subject: 'Relive the Best Moments from {event_name}',
    body: `Hey {guest_name},

What an amazing event! Here are some highlights from {event_name}:

📸 {photo_count} photos shared
❤️ {total_likes} likes
💬 {total_comments} comments

View all photos and memories: {event_url}

Thank you for making it unforgettable!

Cheers,
{host_name}`
  },
  next_event_promo: {
    subject: 'You\'re Invited to Our Next Event!',
    body: `Hi {guest_name},

We loved having you at {event_name}! 

We're planning another amazing event and would love to see you there again. Stay tuned for details coming soon!

In the meantime, you can still view photos from our last event: {event_url}

See you soon!

Best,
{host_name}`
  }
};

export default function FollowUpManager() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  
  const [formData, setFormData] = useState({
    followup_type: 'thank_you',
    trigger_type: 'hours_after',
    trigger_value: 24,
    trigger_date: '',
    email_subject: '',
    email_body: '',
    is_active: true
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
      
      const allFollowUps = await base44.entities.FollowUpSchedule.filter({ event_id: eventId }, '-created_date');
      setFollowUps(allFollowUps);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleOpenDialog = (followUp = null) => {
    if (followUp) {
      setEditingFollowUp(followUp);
      setFormData({
        followup_type: followUp.followup_type,
        trigger_type: followUp.trigger_type,
        trigger_value: followUp.trigger_value || '',
        trigger_date: followUp.trigger_date ? format(new Date(followUp.trigger_date), "yyyy-MM-dd'T'HH:mm") : '',
        email_subject: followUp.email_subject,
        email_body: followUp.email_body,
        is_active: followUp.is_active !== false
      });
    } else {
      setEditingFollowUp(null);
      const template = FOLLOWUP_TEMPLATES.thank_you;
      setFormData({
        followup_type: 'thank_you',
        trigger_type: 'hours_after',
        trigger_value: 24,
        trigger_date: '',
        email_subject: template.subject,
        email_body: template.body,
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleTypeChange = (type) => {
    const template = FOLLOWUP_TEMPLATES[type];
    setFormData({
      ...formData,
      followup_type: type,
      email_subject: template.subject,
      email_body: template.body
    });
  };

  const handleSave = async () => {
    if (!formData.email_subject || !formData.email_body) {
      alert('Subject and body are required');
      return;
    }

    try {
      const dataToSave = {
        event_id: eventId,
        ...formData,
        trigger_date: formData.trigger_type === 'specific_date' && formData.trigger_date 
          ? new Date(formData.trigger_date).toISOString() 
          : null,
        trigger_value: formData.trigger_type !== 'specific_date' ? parseInt(formData.trigger_value) : null,
        status: 'scheduled'
      };

      if (editingFollowUp) {
        await base44.entities.FollowUpSchedule.update(editingFollowUp.id, dataToSave);
      } else {
        await base44.entities.FollowUpSchedule.create(dataToSave);
      }

      setShowDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      alert('Failed to save follow-up');
    }
  };

  const handleDelete = async (followUpId) => {
    if (window.confirm('Delete this follow-up schedule?')) {
      try {
        await base44.entities.FollowUpSchedule.delete(followUpId);
        await loadData();
      } catch (error) {
        console.error('Error deleting follow-up:', error);
      }
    }
  };

  const handleToggleActive = async (followUp) => {
    try {
      await base44.entities.FollowUpSchedule.update(followUp.id, {
        is_active: !followUp.is_active
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling follow-up:', error);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      scheduled: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      sent: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Sent' },
      failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Failed' },
      cancelled: { icon: AlertCircle, color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    
    const config = configs[status] || configs.scheduled;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getFollowUpTypeLabel = (type) => {
    const labels = {
      thank_you: '💌 Thank You',
      feedback_request: '📝 Feedback Request',
      event_highlights: '✨ Event Highlights',
      next_event_promo: '🎉 Next Event Promo'
    };
    return labels[type] || type;
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
            <Mail className="w-8 h-8 text-purple-600" />
            Automated Follow-Ups
          </h1>
          <p className="text-gray-600">Schedule automated emails to engage attendees after your event</p>
        </motion.div>

        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            {followUps.length} scheduled follow-up{followUps.length !== 1 ? 's' : ''}
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Plus className="w-4 h-4" />
            New Follow-Up
          </Button>
        </div>

        {followUps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Follow-Ups Scheduled</h3>
              <p className="text-gray-600 mb-4">Create automated email campaigns to stay connected with your attendees</p>
              <Button onClick={() => handleOpenDialog()}>Schedule First Follow-Up</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {followUps.map((followUp, index) => (
              <motion.div
                key={followUp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`bg-white/80 backdrop-blur-sm ${!followUp.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold">{getFollowUpTypeLabel(followUp.followup_type)}</h3>
                          {getStatusBadge(followUp.status)}
                          {!followUp.is_active && <Badge variant="secondary">Disabled</Badge>}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {followUp.trigger_type === 'specific_date' 
                                ? `Send on ${format(new Date(followUp.trigger_date), 'PPP p')}`
                                : `Send ${followUp.trigger_value} ${followUp.trigger_type === 'hours_after' ? 'hours' : 'days'} after event ends`
                              }
                            </span>
                          </div>
                          <div>
                            <strong>Subject:</strong> {followUp.email_subject}
                          </div>
                        </div>

                        {followUp.status === 'sent' && (
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600">✓ {followUp.emails_sent} sent</span>
                            {followUp.emails_failed > 0 && (
                              <span className="text-red-600">✗ {followUp.emails_failed} failed</span>
                            )}
                            <span className="text-gray-600">Sent: {format(new Date(followUp.sent_date), 'PPP p')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(followUp)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(followUp)}
                          className={followUp.is_active ? 'bg-green-50' : 'bg-red-50'}
                        >
                          {followUp.is_active ? '✓' : '✗'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(followUp.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Available Template Variables</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><code className="bg-white px-2 py-1 rounded">{'{event_name}'}</code> - Your event name</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{guest_name}'}</code> - Recipient's name</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{host_name}'}</code> - Your name</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{event_url}'}</code> - Link to event gallery</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{photo_count}'}</code> - Total photos shared</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{total_likes}'}</code> - Total likes on photos</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{total_comments}'}</code> - Total comments</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFollowUp ? 'Edit' : 'Create'} Follow-Up</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Follow-Up Type</Label>
              <Select value={formData.followup_type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thank_you">💌 Thank You</SelectItem>
                  <SelectItem value="feedback_request">📝 Feedback Request</SelectItem>
                  <SelectItem value="event_highlights">✨ Event Highlights</SelectItem>
                  <SelectItem value="next_event_promo">🎉 Next Event Promo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trigger</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours_after">Hours After Event</SelectItem>
                    <SelectItem value="days_after">Days After Event</SelectItem>
                    <SelectItem value="specific_date">Specific Date/Time</SelectItem>
                  </SelectContent>
                </Select>

                {formData.trigger_type !== 'specific_date' ? (
                  <Input
                    type="number"
                    min="1"
                    value={formData.trigger_value}
                    onChange={(e) => setFormData({ ...formData, trigger_value: e.target.value })}
                    placeholder={formData.trigger_type === 'hours_after' ? 'Hours' : 'Days'}
                  />
                ) : (
                  <Input
                    type="datetime-local"
                    value={formData.trigger_date}
                    onChange={(e) => setFormData({ ...formData, trigger_date: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                placeholder="Subject line..."
              />
            </div>

            <div>
              <Label>Email Body</Label>
              <Textarea
                value={formData.email_body}
                onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                rows={12}
                placeholder="Email content..."
              />
              <p className="text-xs text-gray-500 mt-1">Use template variables like {'{guest_name}'} and {'{event_name}'}</p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Enable or disable this follow-up</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={formData.is_active ? 'bg-green-50' : 'bg-red-50'}
              >
                {formData.is_active ? '✓ Active' : '✗ Disabled'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              {editingFollowUp ? 'Update' : 'Create'} Follow-Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}