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
import { ArrowLeft, Sparkles, DollarSign, Plus, Edit, Trash2, TrendingUp, Calendar, Users, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BUDGET_CATEGORIES = [
  { value: 'venue', label: '🏛️ Venue', color: 'bg-blue-100 text-blue-800' },
  { value: 'catering', label: '🍽️ Catering', color: 'bg-green-100 text-green-800' },
  { value: 'entertainment', label: '🎵 Entertainment', color: 'bg-purple-100 text-purple-800' },
  { value: 'decorations', label: '🎨 Decorations', color: 'bg-pink-100 text-pink-800' },
  { value: 'photography', label: '📸 Photography', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'marketing', label: '📢 Marketing', color: 'bg-orange-100 text-orange-800' },
  { value: 'transportation', label: '🚗 Transportation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'staffing', label: '👥 Staffing', color: 'bg-red-100 text-red-800' },
  { value: 'equipment', label: '🔧 Equipment', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'miscellaneous', label: '📦 Miscellaneous', color: 'bg-gray-100 text-gray-800' }
];

export default function EnhancedAIPlanner() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [budgetItems, setBudgetItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const [budgetFormData, setBudgetFormData] = useState({
    category: 'venue',
    item_name: '',
    estimated_cost: '',
    actual_cost: '',
    vendor_name: '',
    vendor_contact: '',
    status: 'planned',
    payment_due_date: '',
    notes: ''
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
      
      const budget = await base44.entities.EventBudget.filter({ event_id: eventId }, '-created_date');
      setBudgetItems(budget);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    try {
      const prompt = `You are an expert event planner and budget consultant. Analyze this event and provide smart budget recommendations:

Event: ${event.name}
Description: ${event.description || 'Not provided'}
Location: ${event.location_address || 'Not specified'}
Expected Guests: ${event.max_tickets || 'Unknown'}

Current Budget Items: ${budgetItems.length > 0 ? budgetItems.map(item => `${item.category}: ${item.item_name} - $${item.estimated_cost}`).join(', ') : 'None set yet'}

Please provide:
1. Budget recommendations for missing categories
2. Cost optimization suggestions for existing items
3. Vendor type recommendations
4. Timeline recommendations for bookings
5. Red flags or potential overspending areas

Format as actionable bullet points with specific dollar amounts where relevant.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true
      });

      alert('💡 AI Recommendations:\n\n' + result);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations. Please try again.');
    }
    setGenerating(false);
  };

  const handleOpenBudgetDialog = (item = null) => {
    if (item) {
      setEditingBudget(item);
      setBudgetFormData({
        category: item.category,
        item_name: item.item_name,
        estimated_cost: item.estimated_cost.toString(),
        actual_cost: item.actual_cost?.toString() || '',
        vendor_name: item.vendor_name || '',
        vendor_contact: item.vendor_contact || '',
        status: item.status,
        payment_due_date: item.payment_due_date || '',
        notes: item.notes || ''
      });
    } else {
      setEditingBudget(null);
      setBudgetFormData({
        category: 'venue',
        item_name: '',
        estimated_cost: '',
        actual_cost: '',
        vendor_name: '',
        vendor_contact: '',
        status: 'planned',
        payment_due_date: '',
        notes: ''
      });
    }
    setShowBudgetDialog(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetFormData.item_name || !budgetFormData.estimated_cost) {
      alert('Item name and estimated cost are required');
      return;
    }

    try {
      const dataToSave = {
        event_id: eventId,
        category: budgetFormData.category,
        item_name: budgetFormData.item_name,
        estimated_cost: parseFloat(budgetFormData.estimated_cost),
        actual_cost: budgetFormData.actual_cost ? parseFloat(budgetFormData.actual_cost) : null,
        vendor_name: budgetFormData.vendor_name || null,
        vendor_contact: budgetFormData.vendor_contact || null,
        status: budgetFormData.status,
        payment_due_date: budgetFormData.payment_due_date || null,
        notes: budgetFormData.notes || null
      };

      if (editingBudget) {
        await base44.entities.EventBudget.update(editingBudget.id, dataToSave);
      } else {
        await base44.entities.EventBudget.create(dataToSave);
      }

      setShowBudgetDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving budget item:', error);
      alert('Failed to save budget item');
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (window.confirm('Delete this budget item?')) {
      try {
        await base44.entities.EventBudget.delete(budgetId);
        await loadData();
      } catch (error) {
        console.error('Error deleting budget item:', error);
      }
    }
  };

  const calculateBudgetSummary = () => {
    const totalEstimated = budgetItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
    const totalActual = budgetItems.reduce((sum, item) => sum + (item.actual_cost || 0), 0);
    const variance = totalActual - totalEstimated;
    const variancePercent = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : 0;

    const byCategory = {};
    budgetItems.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { estimated: 0, actual: 0, count: 0 };
      }
      byCategory[item.category].estimated += item.estimated_cost || 0;
      byCategory[item.category].actual += item.actual_cost || 0;
      byCategory[item.category].count += 1;
    });

    return { totalEstimated, totalActual, variance, variancePercent, byCategory };
  };

  const exportBudget = () => {
    const summary = calculateBudgetSummary();
    const csv = [
      ['Category', 'Item', 'Estimated Cost', 'Actual Cost', 'Vendor', 'Status', 'Payment Due', 'Notes'].join(','),
      ...budgetItems.map(item => [
        item.category,
        item.item_name,
        item.estimated_cost,
        item.actual_cost || '',
        item.vendor_name || '',
        item.status,
        item.payment_due_date || '',
        item.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name}-budget.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const summary = calculateBudgetSummary();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
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
            Enhanced AI Event Planner
          </h1>
          <p className="text-gray-600">Smart budget tracking, vendor management, and AI-powered recommendations</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Estimated</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${summary.totalEstimated.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Actual</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${summary.totalActual.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${summary.variance >= 0 ? 'from-red-50 to-orange-50 border-red-200' : 'from-green-50 to-emerald-50 border-green-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Variance</p>
                  <p className={`text-3xl font-bold ${summary.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summary.variance >= 0 ? '+' : ''}${Math.abs(summary.variance).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {summary.variance >= 0 ? 'Over' : 'Under'} budget by {Math.abs(summary.variancePercent)}%
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${summary.variance >= 0 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <span className="text-2xl">{summary.variance >= 0 ? '📈' : '📉'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button onClick={() => handleOpenBudgetDialog()} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4" />
              Add Budget Item
            </Button>
            <Button
              onClick={handleGenerateRecommendations}
              disabled={generating}
              variant="outline"
              className="gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Recommendations
                </>
              )}
            </Button>
          </div>
          {budgetItems.length > 0 && (
            <Button onClick={exportBudget} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Items ({budgetItems.length})</TabsTrigger>
            <TabsTrigger value="planned">Planned ({budgetItems.filter(i => i.status === 'planned').length})</TabsTrigger>
            <TabsTrigger value="booked">Booked ({budgetItems.filter(i => i.status === 'booked').length})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({budgetItems.filter(i => i.status === 'paid').length})</TabsTrigger>
          </TabsList>

          {['all', 'planned', 'booked', 'paid'].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue}>
              {budgetItems.filter(item => tabValue === 'all' || item.status === tabValue).length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Budget Items</h3>
                    <p className="text-gray-600 mb-4">Start tracking your event budget by adding items</p>
                    <Button onClick={() => handleOpenBudgetDialog()}>Add First Item</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {budgetItems.filter(item => tabValue === 'all' || item.status === tabValue).map((item, index) => {
                    const categoryInfo = BUDGET_CATEGORIES.find(c => c.value === item.category);
                    const variance = (item.actual_cost || 0) - item.estimated_cost;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-white/80 backdrop-blur-sm">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-lg font-bold">{item.item_name}</h3>
                                  <Badge className={categoryInfo.color}>{categoryInfo.label}</Badge>
                                  <Badge variant="outline">{item.status.toUpperCase()}</Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                  <div>
                                    <p className="text-xs text-gray-600">Estimated</p>
                                    <p className="text-lg font-semibold">${item.estimated_cost.toLocaleString()}</p>
                                  </div>
                                  {item.actual_cost && (
                                    <div>
                                      <p className="text-xs text-gray-600">Actual</p>
                                      <p className="text-lg font-semibold">${item.actual_cost.toLocaleString()}</p>
                                    </div>
                                  )}
                                  {item.vendor_name && (
                                    <div>
                                      <p className="text-xs text-gray-600">Vendor</p>
                                      <p className="text-sm font-medium">{item.vendor_name}</p>
                                    </div>
                                  )}
                                  {item.payment_due_date && (
                                    <div>
                                      <p className="text-xs text-gray-600">Payment Due</p>
                                      <p className="text-sm font-medium">{item.payment_due_date}</p>
                                    </div>
                                  )}
                                </div>

                                {item.notes && (
                                  <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-2 rounded">{item.notes}</p>
                                )}

                                {item.actual_cost && variance !== 0 && (
                                  <div className="mt-3">
                                    <Badge className={variance > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                      {variance > 0 ? '↑' : '↓'} ${Math.abs(variance).toLocaleString()} {variance > 0 ? 'over' : 'under'} budget
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 ml-4">
                                <Button size="sm" variant="outline" onClick={() => handleOpenBudgetDialog(item)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteBudget(item.id)} className="text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {Object.keys(summary.byCategory).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Budget Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.byCategory).map(([category, data]) => {
                  const categoryInfo = BUDGET_CATEGORIES.find(c => c.value === category);
                  const percent = ((data.estimated / summary.totalEstimated) * 100).toFixed(1);
                  
                  return (
                    <div key={category} className="flex items-center gap-4">
                      <Badge className={categoryInfo.color}>{categoryInfo.label}</Badge>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{data.count} items</span>
                          <span className="font-semibold">${data.estimated.toLocaleString()} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit' : 'Add'} Budget Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={budgetFormData.category} onValueChange={(value) => setBudgetFormData({ ...budgetFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={budgetFormData.status} onValueChange={(value) => setBudgetFormData({ ...budgetFormData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Item Name *</Label>
              <Input
                value={budgetFormData.item_name}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, item_name: e.target.value })}
                placeholder="e.g., Grand Ballroom Rental, Catering Service..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Cost *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetFormData.estimated_cost}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, estimated_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Actual Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetFormData.actual_cost}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, actual_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor Name</Label>
                <Input
                  value={budgetFormData.vendor_name}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, vendor_name: e.target.value })}
                  placeholder="Company name..."
                />
              </div>

              <div>
                <Label>Payment Due Date</Label>
                <Input
                  type="date"
                  value={budgetFormData.payment_due_date}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, payment_due_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Vendor Contact</Label>
              <Input
                value={budgetFormData.vendor_contact}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, vendor_contact: e.target.value })}
                placeholder="Phone, email, or website..."
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={budgetFormData.notes}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, notes: e.target.value })}
                placeholder="Additional details, requirements, contract terms..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveBudget} className="bg-purple-600 hover:bg-purple-700">
              {editingBudget ? 'Update' : 'Add'} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}