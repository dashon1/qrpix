import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Flag, Bug, Check, X, AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FeatureFlags() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [showBugDialog, setShowBugDialog] = useState(false);
  const [selectedFlagForBug, setSelectedFlagForBug] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bugStatusFilter, setBugStatusFilter] = useState('all');
  const [bugSeverityFilter, setBugSeverityFilter] = useState('all');
  const [releaseGroupFilter, setReleaseGroupFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    feature_id: '',
    display_name: '',
    description: '',
    category: 'Content',
    release_group: '',
    release_date: '',
    enabled_globally: false,
    beta_testing_mode: false,
    enabled_for_roles: ['admin'],
    enabled_for_tiers: [],
    beta_testers: '',
    is_active: true
  });

  const [bugFormData, setBugFormData] = useState({
    severity: 'medium',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }

      const allFlags = await base44.entities.FeatureFlag.list('-created_date');
      setFlags(allFlags);
    } catch (error) {
      console.error('Error loading feature flags:', error);
    }
    setLoading(false);
  };

  const handleOpenDialog = (flag = null) => {
    if (flag) {
      setEditingFlag(flag);
      setFormData({
        feature_id: flag.feature_id,
        display_name: flag.display_name,
        description: flag.description || '',
        category: flag.category,
        release_group: flag.release_group || '',
        release_date: flag.release_date ? format(new Date(flag.release_date), "yyyy-MM-dd'T'HH:mm") : '',
        enabled_globally: flag.enabled_globally || false,
        beta_testing_mode: flag.beta_testing_mode || false,
        enabled_for_roles: flag.enabled_for_roles || ['admin'],
        enabled_for_tiers: flag.enabled_for_tiers || [],
        beta_testers: (flag.beta_testers || []).join(', '),
        is_active: flag.is_active !== false
      });
    } else {
      setEditingFlag(null);
      setFormData({
        feature_id: '',
        display_name: '',
        description: '',
        category: 'Content',
        release_group: '',
        release_date: '',
        enabled_globally: false,
        beta_testing_mode: false,
        enabled_for_roles: ['admin'],
        enabled_for_tiers: [],
        beta_testers: '',
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.feature_id || !formData.display_name) {
      alert('Feature ID and Display Name are required');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        beta_testers: formData.beta_testers
          .split(',')
          .map(email => email.trim())
          .filter(email => email),
        release_date: formData.release_date ? new Date(formData.release_date).toISOString() : null
      };

      if (editingFlag) {
        await base44.entities.FeatureFlag.update(editingFlag.id, dataToSave);
      } else {
        await base44.entities.FeatureFlag.create(dataToSave);
      }

      setShowDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving feature flag:', error);
      alert('Failed to save feature flag: ' + error.message);
    }
  };

  const handleDelete = async (flagId) => {
    if (window.confirm('Delete this feature flag? This cannot be undone.')) {
      try {
        await base44.entities.FeatureFlag.delete(flagId);
        await loadData();
      } catch (error) {
        console.error('Error deleting flag:', error);
        alert('Failed to delete flag');
      }
    }
  };

  const handleToggleActive = async (flag) => {
    try {
      await base44.entities.FeatureFlag.update(flag.id, {
        is_active: !flag.is_active
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const handleOpenBugDialog = (flag) => {
    setSelectedFlagForBug(flag);
    setBugFormData({ severity: 'medium', description: '' });
    setShowBugDialog(true);
  };

  const handleSubmitBugReport = async () => {
    if (!bugFormData.description.trim()) {
      alert('Please describe the bug');
      return;
    }

    try {
      const newBugReport = {
        reporter_email: currentUser.email,
        reporter_name: currentUser.full_name,
        report_date: new Date().toISOString(),
        severity: bugFormData.severity,
        description: bugFormData.description,
        status: 'open'
      };

      const existingBugs = selectedFlagForBug.bug_reports || [];
      await base44.entities.FeatureFlag.update(selectedFlagForBug.id, {
        bug_reports: [...existingBugs, newBugReport]
      });

      alert('Bug report submitted successfully!');
      setShowBugDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      alert('Failed to submit bug report');
    }
  };

  const handleUpdateBugStatus = async (flag, bugIndex, newStatus) => {
    try {
      const updatedBugs = [...flag.bug_reports];
      updatedBugs[bugIndex] = { ...updatedBugs[bugIndex], status: newStatus };
      
      await base44.entities.FeatureFlag.update(flag.id, {
        bug_reports: updatedBugs
      });
      
      await loadData();
    } catch (error) {
      console.error('Error updating bug status:', error);
      alert('Failed to update bug status');
    }
  };

  const handleRoleToggle = (role) => {
    const newRoles = formData.enabled_for_roles.includes(role)
      ? formData.enabled_for_roles.filter(r => r !== role)
      : [...formData.enabled_for_roles, role];
    setFormData({ ...formData, enabled_for_roles: newRoles });
  };

  const handleTierToggle = (tier) => {
    const newTiers = formData.enabled_for_tiers.includes(tier)
      ? formData.enabled_for_tiers.filter(t => t !== tier)
      : [...formData.enabled_for_tiers, tier];
    setFormData({ ...formData, enabled_for_tiers: newTiers });
  };

  // Aggregate all bug reports from all flags
  const getAllBugReports = () => {
    const allBugs = [];
    flags.forEach(flag => {
      if (flag.bug_reports && flag.bug_reports.length > 0) {
        flag.bug_reports.forEach((bug, index) => {
          allBugs.push({
            ...bug,
            flag_id: flag.id,
            flag_name: flag.display_name,
            flag_feature_id: flag.feature_id,
            bug_index: index
          });
        });
      }
    });
    return allBugs.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
  };

  const getFilteredBugs = () => {
    let bugs = getAllBugReports();
    
    if (bugStatusFilter !== 'all') {
      bugs = bugs.filter(bug => bug.status === bugStatusFilter);
    }
    
    if (bugSeverityFilter !== 'all') {
      bugs = bugs.filter(bug => bug.severity === bugSeverityFilter);
    }
    
    return bugs;
  };

  const getBugStats = () => {
    const allBugs = getAllBugReports();
    return {
      total: allBugs.length,
      open: allBugs.filter(b => b.status === 'open').length,
      in_progress: allBugs.filter(b => b.status === 'in_progress').length,
      resolved: allBugs.filter(b => b.status === 'resolved').length,
      critical: allBugs.filter(b => b.severity === 'critical').length,
      high: allBugs.filter(b => b.severity === 'high').length
    };
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress': return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'wont_fix': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'wont_fix': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Content': 'bg-blue-100 text-blue-800',
      'Ticketing': 'bg-green-100 text-green-800',
      'Print Shop': 'bg-purple-100 text-purple-800',
      'AI Features': 'bg-pink-100 text-pink-800',
      'Analytics': 'bg-orange-100 text-orange-800',
      'Social': 'bg-cyan-100 text-cyan-800',
      'Payments': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const bugStats = getBugStats();
  const filteredBugs = getFilteredBugs();

  const filteredFlags = releaseGroupFilter === 'all' 
    ? flags 
    : flags.filter(flag => flag.release_group === releaseGroupFilter);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('AdminDashboard'))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <Flag className="w-8 h-8 text-purple-600" />
              Feature Flags
            </h1>
            <p className="text-gray-600 mt-2">Manage beta features, rollouts, and access control</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Plus className="w-4 h-4" />
            New Feature Flag
          </Button>
        </div>

        <Tabs defaultValue="flags" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="flags" className="gap-2">
              <Flag className="w-4 h-4" />
              Feature Flags ({flags.length})
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-2">
              <Bug className="w-4 h-4" />
              Bug Reports ({bugStats.open} open)
            </TabsTrigger>
          </TabsList>

          {/* Feature Flags Tab */}
          <TabsContent value="flags" className="space-y-4">
            {/* Release Group Filter */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-semibold">Release Group:</Label>
                  <Select value={releaseGroupFilter} onValueChange={setReleaseGroupFilter}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups ({flags.length})</SelectItem>
                      <SelectItem value="Group 1: Ticketing & Payments">Group 1: Ticketing & Payments</SelectItem>
                      <SelectItem value="Group 2: Engagement & Gamification">Group 2: Engagement & Gamification</SelectItem>
                      <SelectItem value="Group 3: Photo AI & Smart Features">Group 3: Photo AI & Smart Features</SelectItem>
                      <SelectItem value="Group 4: Communication & Notifications">Group 4: Communication & Notifications</SelectItem>
                      <SelectItem value="Group 5: Monetization & Commerce">Group 5: Monetization & Commerce</SelectItem>
                      <SelectItem value="Group 6: Branding & Customization">Group 6: Branding & Customization</SelectItem>
                      <SelectItem value="Group 7: Collaboration & Planning">Group 7: Collaboration & Planning</SelectItem>
                      <SelectItem value="Group 8: Venue & Logistics">Group 8: Venue & Logistics</SelectItem>
                      <SelectItem value="Group 9: Analytics & Insights">Group 9: Analytics & Insights</SelectItem>
                      <SelectItem value="Group 10: Content & Media">Group 10: Content & Media</SelectItem>
                      <SelectItem value="Group 11: Developer & Enterprise">Group 11: Developer & Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto text-sm text-gray-600">
                    Showing {filteredFlags.length} of {flags.length} features
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredFlags.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Feature Flags Yet</h3>
                  <p className="text-gray-600 mb-4">Create your first feature flag to start managing rollouts</p>
                  <Button onClick={() => handleOpenDialog()}>Create Feature Flag</Button>
                </CardContent>
              </Card>
            ) : (
              filteredFlags.map((flag) => (
                <motion.div key={flag.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`${!flag.is_active ? 'opacity-50' : ''} bg-white/80 backdrop-blur-sm`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold">{flag.display_name}</h3>
                          <Badge className={getCategoryColor(flag.category)}>{flag.category}</Badge>
                          {flag.release_group && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              {flag.release_group}
                            </Badge>
                          )}
                          {flag.enabled_globally && (
                            <Badge className="bg-green-500 text-white">Live for Everyone</Badge>
                          )}
                          {flag.beta_testing_mode && (
                            <Badge className="bg-yellow-500 text-white">Beta Testing</Badge>
                          )}
                          {!flag.is_active && (
                            <Badge variant="destructive">Disabled</Badge>
                          )}
                        </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{flag.feature_id}</code>
                          </p>
                          
                          {flag.description && (
                            <p className="text-gray-700 mb-3">{flag.description}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm">
                            {flag.release_date && (
                              <div>
                                <span className="text-gray-600">📅 Release: </span>
                                <span className="font-medium">{format(new Date(flag.release_date), 'PPP p')}</span>
                              </div>
                            )}
                            
                            {flag.enabled_for_roles && flag.enabled_for_roles.length > 0 && (
                              <div>
                                <span className="text-gray-600">👥 Roles: </span>
                                <span className="font-medium">{flag.enabled_for_roles.join(', ')}</span>
                              </div>
                            )}
                            
                            {flag.enabled_for_tiers && flag.enabled_for_tiers.length > 0 && (
                              <div>
                                <span className="text-gray-600">💎 Tiers: </span>
                                <span className="font-medium">{flag.enabled_for_tiers.join(', ')}</span>
                              </div>
                            )}
                            
                            {flag.beta_testers && flag.beta_testers.length > 0 && (
                              <div>
                                <span className="text-gray-600">🧪 Beta Testers: </span>
                                <span className="font-medium">{flag.beta_testers.length}</span>
                              </div>
                            )}

                            {flag.bug_reports && flag.bug_reports.length > 0 && (
                              <div>
                                <span className="text-gray-600">🐛 Bug Reports: </span>
                                <span className="font-medium">{flag.bug_reports.filter(b => b.status === 'open').length} open</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenBugDialog(flag)}
                            className="gap-2"
                          >
                            <Bug className="w-4 h-4" />
                            Report Bug
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(flag)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(flag)}
                            className={flag.is_active ? 'bg-green-50' : 'bg-red-50'}
                          >
                            {flag.is_active ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(flag.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Bug Reports Tab */}
          <TabsContent value="bugs" className="space-y-6">
            {/* Bug Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{bugStats.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Reports</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{bugStats.open}</div>
                    <div className="text-xs text-red-700 mt-1">Open</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{bugStats.in_progress}</div>
                    <div className="text-xs text-blue-700 mt-1">In Progress</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{bugStats.resolved}</div>
                    <div className="text-xs text-green-700 mt-1">Resolved</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-100 border-red-300">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-700">{bugStats.critical}</div>
                    <div className="text-xs text-red-800 mt-1">Critical</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-100 border-orange-300">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-700">{bugStats.high}</div>
                    <div className="text-xs text-orange-800 mt-1">High Priority</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Status:</Label>
                    <Select value={bugStatusFilter} onValueChange={setBugStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="wont_fix">Won't Fix</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Severity:</Label>
                    <Select value={bugSeverityFilter} onValueChange={setBugSeverityFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto text-sm text-gray-600">
                    Showing {filteredBugs.length} of {bugStats.total} reports
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bug Reports List */}
            {filteredBugs.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <Bug className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Bug Reports</h3>
                  <p className="text-gray-600">No bugs match your current filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBugs.map((bug, idx) => {
                  const flag = flags.find(f => f.id === bug.flag_id);
                  return (
                    <motion.div
                      key={`${bug.flag_id}-${bug.bug_index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className={`bg-white/80 backdrop-blur-sm border-l-4 ${
                        bug.severity === 'critical' ? 'border-l-red-500' :
                        bug.severity === 'high' ? 'border-l-orange-500' :
                        bug.severity === 'medium' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-lg font-bold">{bug.flag_name}</h3>
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">
                                  {bug.flag_feature_id}
                                </code>
                                <Badge className={`${getSeverityColor(bug.severity)} border flex items-center gap-1`}>
                                  {getSeverityIcon(bug.severity)}
                                  {bug.severity.toUpperCase()}
                                </Badge>
                                <Badge className={`${getStatusColor(bug.status)} border flex items-center gap-1`}>
                                  {getStatusIcon(bug.status)}
                                  {bug.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-3">
                                <span className="font-medium">Reported by:</span> {bug.reporter_name} ({bug.reporter_email})
                                <span className="mx-2">•</span>
                                <span className="font-medium">Date:</span> {format(new Date(bug.report_date), 'PPP p')}
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-gray-800 whitespace-pre-wrap">{bug.description}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBugStatus(flag, bug.bug_index, 'in_progress')}
                              disabled={bug.status === 'in_progress'}
                              className="gap-2"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Mark In Progress
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBugStatus(flag, bug.bug_index, 'resolved')}
                              disabled={bug.status === 'resolved'}
                              className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Resolved
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBugStatus(flag, bug.bug_index, 'wont_fix')}
                              disabled={bug.status === 'wont_fix'}
                              className="gap-2 text-gray-600"
                            >
                              <XCircle className="w-3 h-3" />
                              Won't Fix
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateBugStatus(flag, bug.bug_index, 'open')}
                              disabled={bug.status === 'open'}
                              className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Reopen
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlag ? 'Edit' : 'Create'} Feature Flag</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Feature ID *</Label>
                <Input
                  value={formData.feature_id}
                  onChange={(e) => setFormData({ ...formData, feature_id: e.target.value })}
                  placeholder="bulk_tickets"
                  disabled={!!editingFlag}
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (cannot be changed after creation)</p>
              </div>

              <div>
                <Label>Display Name *</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Bulk Ticket Issuance"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this feature do?"
                rows={2}
              />
            </div>

            <div>
              <Label>Release Group</Label>
              <Select value={formData.release_group} onValueChange={(value) => setFormData({ ...formData, release_group: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select release group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No Group</SelectItem>
                  <SelectItem value="Group 1: Ticketing & Payments">Group 1: Ticketing & Payments</SelectItem>
                  <SelectItem value="Group 2: Engagement & Gamification">Group 2: Engagement & Gamification</SelectItem>
                  <SelectItem value="Group 3: Photo AI & Smart Features">Group 3: Photo AI & Smart Features</SelectItem>
                  <SelectItem value="Group 4: Communication & Notifications">Group 4: Communication & Notifications</SelectItem>
                  <SelectItem value="Group 5: Monetization & Commerce">Group 5: Monetization & Commerce</SelectItem>
                  <SelectItem value="Group 6: Branding & Customization">Group 6: Branding & Customization</SelectItem>
                  <SelectItem value="Group 7: Collaboration & Planning">Group 7: Collaboration & Planning</SelectItem>
                  <SelectItem value="Group 8: Venue & Logistics">Group 8: Venue & Logistics</SelectItem>
                  <SelectItem value="Group 9: Analytics & Insights">Group 9: Analytics & Insights</SelectItem>
                  <SelectItem value="Group 10: Content & Media">Group 10: Content & Media</SelectItem>
                  <SelectItem value="Group 11: Developer & Enterprise">Group 11: Developer & Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Content">Content</SelectItem>
                    <SelectItem value="Ticketing">Ticketing</SelectItem>
                    <SelectItem value="Print Shop">Print Shop</SelectItem>
                    <SelectItem value="AI Features">AI Features</SelectItem>
                    <SelectItem value="Analytics">Analytics</SelectItem>
                    <SelectItem value="Social">Social</SelectItem>
                    <SelectItem value="Payments">Payments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Release Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Auto-enable globally on this date</p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Feature Globally</Label>
                  <p className="text-xs text-gray-500">Feature is live for everyone (overrides all other settings)</p>
                </div>
                <Switch
                  checked={formData.enabled_globally}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled_globally: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Beta Testing Mode</Label>
                  <p className="text-xs text-gray-500">Only enabled for beta testers and selected roles/tiers</p>
                </div>
                <Switch
                  checked={formData.beta_testing_mode}
                  onCheckedChange={(checked) => setFormData({ ...formData, beta_testing_mode: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-gray-500">Master kill switch - disable feature completely</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Enabled for Roles</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled_for_roles.includes('admin')}
                    onChange={() => handleRoleToggle('admin')}
                    className="rounded"
                  />
                  <span className="text-sm">Admin</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled_for_roles.includes('user')}
                    onChange={() => handleRoleToggle('user')}
                    className="rounded"
                  />
                  <span className="text-sm">User</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Enabled for Tiers</Label>
              <div className="flex gap-4 flex-wrap">
                {['free', 'starter', 'pro', 'business'].map(tier => (
                  <label key={tier} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled_for_tiers.includes(tier)}
                      onChange={() => handleTierToggle(tier)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{tier}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Beta Testers (comma separated)</Label>
              <Textarea
                value={formData.beta_testers}
                onChange={(e) => setFormData({ ...formData, beta_testers: e.target.value })}
                placeholder="user1@example.com, user2@example.com"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Users with these emails will have access during beta testing</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              {editingFlag ? 'Update' : 'Create'} Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bug Report Dialog */}
      <Dialog open={showBugDialog} onOpenChange={setShowBugDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Bug for {selectedFlagForBug?.display_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Severity</Label>
              <Select value={bugFormData.severity} onValueChange={(value) => setBugFormData({ ...bugFormData, severity: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low - Minor issue</SelectItem>
                  <SelectItem value="medium">🟡 Medium - Affects functionality</SelectItem>
                  <SelectItem value="high">🟠 High - Major issue</SelectItem>
                  <SelectItem value="critical">🔴 Critical - Blocks usage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={bugFormData.description}
                onChange={(e) => setBugFormData({ ...bugFormData, description: e.target.value })}
                placeholder="Describe the bug, steps to reproduce, and expected behavior..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBugDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitBugReport} className="bg-red-600 hover:bg-red-700">
              Submit Bug Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}