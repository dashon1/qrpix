import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Star, Trash2, Edit, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import MobileSelect from "../components/mobile/MobileSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PLAN_TYPES = [
  { value: 'timeline', label: '📅 Event Timeline', prompt: 'Create a detailed timeline for my event' },
  { value: 'activities', label: '🎯 Activity Ideas', prompt: 'Suggest engaging activities for my event' },
  { value: 'theme', label: '🎨 Theme Suggestions', prompt: 'Suggest creative themes for my event' },
  { value: 'budget', label: '💰 Budget Planning', prompt: 'Help me plan a budget breakdown for my event' },
  { value: 'checklist', label: '✅ Planning Checklist', prompt: 'Create a comprehensive planning checklist' },
  { value: 'custom', label: '💭 Custom Question', prompt: '' }
];

export default function AIPlanner() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [planType, setPlanType] = useState('timeline');
  const [editingPlan, setEditingPlan] = useState(null);
  const [editNotes, setEditNotes] = useState('');

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
      
      const plansData = await base44.entities.EventPlan.filter({ event_id: eventId }, '-created_date');
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleGeneratePlan = async () => {
    if (!prompt.trim()) {
      alert('Please enter your planning question or request');
      return;
    }

    setGenerating(true);
    try {
      const contextPrompt = `You are an expert event planner. Help plan an event with these details:
      
Event Name: ${event.name}
Event Type: ${event.event_template}
${event.description ? `Description: ${event.description}` : ''}
${event.location_address ? `Location: ${event.location_address}` : ''}
${event.start_date ? `Start Date: ${new Date(event.start_date).toLocaleDateString()}` : ''}
${event.num_tables && event.people_per_table ? `Capacity: ${event.num_tables * event.people_per_table} guests` : ''}

User Request: ${prompt}

Provide detailed, actionable advice formatted with clear sections, bullet points, and markdown formatting.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: false
      });

      const newPlan = await base44.entities.EventPlan.create({
        event_id: eventId,
        plan_type: planType,
        prompt: prompt,
        ai_response: response,
        is_favorite: false
      });

      setPlans([newPlan, ...plans]);
      setPrompt('');
      setPlanType('timeline');
      alert('✨ AI plan generated successfully!');
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate plan. Please try again.');
    }
    setGenerating(false);
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Delete this plan?')) {
      try {
        await base44.entities.EventPlan.delete(planId);
        setPlans(plans.filter(p => p.id !== planId));
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  const handleToggleFavorite = async (plan) => {
    try {
      await base44.entities.EventPlan.update(plan.id, { is_favorite: !plan.is_favorite });
      setPlans(plans.map(p => p.id === plan.id ? { ...p, is_favorite: !p.is_favorite } : p));
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const handleSaveNotes = async () => {
    if (!editingPlan) return;
    
    try {
      await base44.entities.EventPlan.update(editingPlan.id, { notes: editNotes });
      setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, notes: editNotes } : p));
      setEditingPlan(null);
      setEditNotes('');
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const selectedPlanType = PLAN_TYPES.find(t => t.value === planType);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-theme-main">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))} className="tap-target">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-purple-600" />
                AI Event Planner
              </h1>
              <p className="text-gray-600">{event?.name}</p>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ask AI for Planning Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>What do you need help with?</Label>
              <MobileSelect
                value={planType}
                onValueChange={setPlanType}
                placeholder="Select plan type"
                label="What do you need help with?"
                options={PLAN_TYPES.map(t => ({ value: t.value, label: t.label }))}
              />
            </div>

            <div>
              <Label>Your Question or Request</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={selectedPlanType?.prompt || 'Ask anything about planning your event...'}
                rows={4}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleGeneratePlan}
              disabled={generating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating AI Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Plans ({plans.length})</h2>
          
          {plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500">No plans yet. Ask AI for help above!</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {plans.map(plan => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className={plan.is_favorite ? 'border-2 border-yellow-400' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{PLAN_TYPES.find(t => t.value === plan.plan_type)?.label}</Badge>
                            {plan.is_favorite && (
                              <Badge className="bg-yellow-400 text-yellow-900">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Favorite
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{plan.prompt}</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(plan.created_date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="tap-target"
                            onClick={() => handleToggleFavorite(plan)}
                          >
                            <Star className={`w-4 h-4 ${plan.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="tap-target"
                            onClick={() => {
                              setEditingPlan(plan);
                              setEditNotes(plan.notes || '');
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="tap-target"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none mb-4 whitespace-pre-wrap">
                        {plan.ai_response}
                      </div>
                      
                      {plan.notes && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Your Notes:</p>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">{plan.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes to Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add your own notes, modifications, or ideas..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              <Save className="w-4 h-4 mr-2" />
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}