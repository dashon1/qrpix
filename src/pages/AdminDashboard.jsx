
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, Calendar, PlusCircle, Crown, Clock, Mail, Trash2, Package, Bug, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Switch } from "@/components/ui/switch";

const PLAN_COLORS = {
  free: "bg-gray-100 text-gray-800",
  pro: "bg-purple-100 text-purple-800",
  business: "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
};

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  business: "Business"
};

const PRODUCT_CATEGORIES = [
  { value: "prints", label: "Photo Prints" },
  { value: "canvas", label: "Canvas & Frames" },
  { value: "apparel", label: "Apparel" },
  { value: "drinkware", label: "Drinkware" },
  { value: "gifts", label: "Gifts & More" }
];

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

const STATUS_COLORS = {
  open: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  wont_fix: "bg-red-100 text-red-800"
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [printProducts, setPrintProducts] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sending, setSending] = useState(false);
  const [showBugDialog, setShowBugDialog] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [bugForm, setBugForm] = useState({
    status: 'open',
    severity: 'medium',
    resolutionMessage: '',
    sendEmail: true
  });
  const [resolvingBug, setResolvingBug] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'prints',
    base_price: '',
    mockup_image_url: '',
    product_image_url: '',
    sizes: [{ size_name: '', upcharge_amount: 0 }],
    is_active: true,
    display_order: 0
  });
  const [editForm, setEditForm] = useState({
    credits: 0,
    trial_ends_at: '',
    subscription_plan: 'free'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userData, eventData, productData, bugData] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Event.list(undefined, 100),
        base44.entities.PrintProduct.list(),
        base44.entities.BugReport.list()
      ]);
      setUsers(userData);
      setEvents(eventData);
      setPrintProducts(productData);
      setBugReports(bugData);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (window.confirm(`Are you sure you want to delete the user "${userEmail}"? This action cannot be undone.`)) {
      try {
        await base44.entities.User.delete(userId);
        await fetchData();
        alert('User deleted successfully');
      } catch (error) {
        alert("Failed to delete user: " + error.message);
        console.error(error);
      }
    }
  };

  const handleAddCredits = async (userId) => {
    const amount = parseInt(prompt("How many credits to add?"), 10);
    if (!isNaN(amount) && amount > 0) {
      try {
        const user = users.find(u => u.id === userId);
        const newCredits = (user.credits || 0) + amount;
        await base44.entities.User.update(userId, { credits: newCredits });
        await fetchData();
      } catch (error) {
        alert("Failed to add credits.");
        console.error(error);
      }
    }
  };

  const handleChangePlan = async (userId, newPlan) => {
    try {
      await base44.entities.User.update(userId, { subscription_plan: newPlan });
      await fetchData();
    } catch (error) {
      alert("Failed to update plan.");
      console.error(error);
    }
  };

  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    setEditForm({
      credits: user.credits || 0,
      trial_ends_at: user.trial_ends_at ? format(parseISO(user.trial_ends_at), "yyyy-MM-dd'T'HH:mm") : '',
      subscription_plan: user.subscription_plan || 'free'
    });
    setShowEditDialog(true);
  };

  const handleSaveUserEdits = async () => {
    if (!editingUser) return;
    
    try {
      const updateData = {
        credits: parseInt(editForm.credits, 10),
        subscription_plan: editForm.subscription_plan
      };
      
      if (editForm.trial_ends_at) {
        updateData.trial_ends_at = new Date(editForm.trial_ends_at).toISOString();
      }
      
      await base44.entities.User.update(editingUser.id, updateData);
      await fetchData();
      setShowEditDialog(false);
      setEditingUser(null);
    } catch (error) {
      alert("Failed to update user.");
      console.error(error);
    }
  };

  const handleExtendTrial = async (userId, days) => {
    try {
      const user = users.find(u => u.id === userId);
      const currentTrialEnd = user.trial_ends_at ? parseISO(user.trial_ends_at) : new Date();
      const newTrialEnd = addDays(currentTrialEnd, days);
      
      await base44.entities.User.update(userId, { 
        trial_ends_at: newTrialEnd.toISOString() 
      });
      await fetchData();
    } catch (error) {
      alert("Failed to extend trial.");
      console.error(error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName) {
      alert("Please provide both name and email");
      return;
    }

    setSending(true);
    try {
      const signupUrl = `${window.location.origin}${createPageUrl('LandingPage')}`;
      
      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: `You're invited to join Eventpix QR!`,
        body: `
          <h2>Hi ${inviteName},</h2>
          <p>You've been invited to join Eventpix QR - the easiest way to capture and share event photos!</p>
          <p>Click the link below to get started:</p>
          <p><a href="${signupUrl}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Join Eventpix QR</a></p>
          <p>Or copy this link: ${signupUrl}</p>
          <p>We look forward to seeing you there!</p>
        `
      });
      
      alert(`Invitation sent to ${inviteEmail} successfully!`);
      setInviteEmail('');
      setInviteName('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error("Failed to send invitation:", error);
      alert("Failed to send invitation. Please try again.");
    }
    setSending(false);
  };

  const handleOpenProductDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        category: product.category || 'prints',
        base_price: product.base_price,
        mockup_image_url: product.mockup_image_url || '',
        product_image_url: product.product_image_url || '',
        sizes: product.sizes?.length > 0 ? product.sizes : [{ size_name: '', upcharge_amount: 0 }],
        is_active: product.is_active !== false,
        display_order: product.display_order || 0
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        category: 'prints',
        base_price: '',
        mockup_image_url: '',
        product_image_url: '',
        sizes: [{ size_name: '', upcharge_amount: 0 }],
        is_active: true,
        display_order: 0
      });
    }
    setShowProductDialog(true);
  };

  const handleAddSize = () => {
    setProductForm({
      ...productForm,
      sizes: [...productForm.sizes, { size_name: '', upcharge_amount: 0 }]
    });
  };

  const handleRemoveSize = (index) => {
    const newSizes = productForm.sizes.filter((_, i) => i !== index);
    setProductForm({ ...productForm, sizes: newSizes });
  };

  const handleSizeChange = (index, field, value) => {
    const newSizes = [...productForm.sizes];
    newSizes[index][field] = field === 'upcharge_amount' ? parseFloat(value) || 0 : value;
    setProductForm({ ...productForm, sizes: newSizes });
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        ...productForm,
        base_price: parseFloat(productForm.base_price) || 0,
        display_order: parseInt(productForm.display_order) || 0
      };

      if (editingProduct) {
        await base44.entities.PrintProduct.update(editingProduct.id, productData);
      } else {
        await base44.entities.PrintProduct.create(productData);
      }

      await fetchData();
      setShowProductDialog(false);
      setEditingProduct(null);
    } catch (error) {
      alert("Failed to save product: " + error.message);
      console.error(error);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      try {
        await base44.entities.PrintProduct.delete(productId);
        await fetchData();
      } catch (error) {
        alert("Failed to delete product: " + error.message);
        console.error(error);
      }
    }
  };

  const handleUploadProductImage = async (file, field) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProductForm({ ...productForm, [field]: file_url });
    } catch (error) {
      alert("Failed to upload image: " + error.message);
    }
  };

  const handleOpenBugDialog = (bug) => {
    setEditingBug(bug);
    setBugForm({
      status: bug.status || 'open',
      severity: bug.severity || 'medium',
      resolutionMessage: bug.resolution_message || '',
      sendEmail: true // Default to true when opening for resolution
    });
    setShowBugDialog(true);
  };

  const handleResolveBug = async () => {
    if (!editingBug) return;

    setResolvingBug(true);
    try {
      const response = await base44.functions.invoke('resolveBugReport', {
        bugReportId: editingBug.id,
        status: bugForm.status,
        severity: bugForm.severity,
        resolutionMessage: bugForm.resolutionMessage.trim() || null, // Ensure empty string becomes null
        sendEmail: bugForm.sendEmail && bugForm.resolutionMessage.trim() !== '' // Only send if message is provided
      });

      if (response.data.success) {
        alert(response.data.message);
        await fetchData();
        setShowBugDialog(false);
        setEditingBug(null);
      } else {
        throw new Error(response.data.error || 'Failed to update bug report');
      }
    } catch (error) {
      console.error('Error resolving bug:', error);
      alert('Failed to update bug report: ' + error.message);
    }
    setResolvingBug(false);
  };

  const handleDeleteBugReport = async (bugId, bugTitle) => {
    if (window.confirm(`Are you sure you want to delete the bug report "${bugTitle}"?`)) {
      try {
        await base44.entities.BugReport.delete(bugId);
        await fetchData();
      } catch (error) {
        alert("Failed to delete bug report: " + error.message);
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading admin data...</div>;
  }

  const openBugs = bugReports.filter(b => b.status === 'open').length;
  const inProgressBugs = bugReports.filter(b => b.status === 'in_progress').length;
  const resolvedBugs = bugReports.filter(b => b.status === 'resolved').length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <PlusCircle className="w-4 h-4" />
          Invite New User
        </Button>
      </div>
      
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" /> Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="w-4 h-4 mr-2" /> Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" /> Products ({printProducts.length})
          </TabsTrigger>
          <TabsTrigger value="bugs">
            <Bug className="w-4 h-4 mr-2" /> Bugs ({bugReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Trial Ends</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.subscription_plan || 'free'}
                          onValueChange={(value) => handleChangePlan(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">
                              <span className="flex items-center gap-2">Free</span>
                            </SelectItem>
                            <SelectItem value="pro">
                              <span className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-purple-600" />
                                Pro
                              </span>
                            </SelectItem>
                            <SelectItem value="business">
                              <span className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-pink-600" />
                                Business
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{user.credits || 0}</TableCell>
                      <TableCell>
                        {user.trial_ends_at ? format(parseISO(user.trial_ends_at), 'PPP') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleOpenEditDialog(user)} className="gap-2">
                            <Clock className="w-4 h-4" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleExtendTrial(user.id, 30)}
                            className="gap-2"
                          >
                            +30d
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Event Overview</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>{event.name}</TableCell>
                      <TableCell>{event.host_email}</TableCell>
                      <TableCell>{event.photo_count || 0}</TableCell>
                      <TableCell>{format(parseISO(event.created_date), 'PPP')}</TableCell>
                      <TableCell>
                        {event.expiration_date ? format(parseISO(event.expiration_date), 'PPP') : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Print Products</CardTitle>
              <Button onClick={() => handleOpenProductDialog()} className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {printProducts.map(product => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="relative h-40 bg-gray-100">
                      {product.mockup_image_url ? (
                        <img 
                          src={product.mockup_image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <Package className="w-12 h-12" />
                        </div>
                      )}
                      {!product.is_active && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary">Inactive</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                      <p className="text-xl font-bold text-purple-600 mb-2">
                        ${product.base_price}
                      </p>
                      <Badge className="mb-3">{PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}</Badge>
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="text-xs text-gray-500 mb-3">
                          Sizes: {product.sizes.map(s => s.size_name).join(', ')}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleOpenProductDialog(product)}
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="mt-4">
          {/* Bug Report Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{bugReports.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{openBugs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-600">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{inProgressBugs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{resolvedBugs}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Bug Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugReports.map(bug => (
                    <TableRow key={bug.id}>
                      <TableCell className="max-w-xs">
                        <div className="font-medium">{bug.title}</div>
                        <div className="text-xs text-gray-500 truncate">{bug.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{bug.reporter_name}</div>
                        <div className="text-xs text-gray-500">{bug.reporter_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {bug.context_page}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[bug.status]}>
                          {bug.status === 'in_progress' ? 'In Progress' : bug.status === 'wont_fix' ? "Won't Fix" : bug.status.charAt(0).toUpperCase() + bug.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[bug.severity]}>
                          {bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(bug.created_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenBugDialog(bug)}
                            className="gap-1"
                          >
                            {bug.status === 'resolved' || bug.status === 'wont_fix' ? 'View' : 'Resolve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBugReport(bug.id, bug.title)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bugReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No bug reports yet. Users can report bugs via the floating button.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
            <DialogDescription>
              Manage user credits, subscription plan, and trial period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={editForm.credits}
                onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select
                value={editForm.subscription_plan}
                onValueChange={(value) => setEditForm({ ...editForm, subscription_plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trial_end">Trial End Date & Time</Label>
              <Input
                id="trial_end"
                type="datetime-local"
                value={editForm.trial_ends_at}
                onChange={(e) => setEditForm({ ...editForm, trial_ends_at: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Set when the user's free trial expires</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUserEdits}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Invite New User
            </DialogTitle>
            <DialogDescription>
              Send an email invitation to join Eventpix QR. The user will receive a link to sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite_name">Full Name</Label>
              <Input
                id="invite_name"
                placeholder="John Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invite_email">Email Address</Label>
              <Input
                id="invite_email"
                type="email"
                placeholder="john@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendInvite} 
                disabled={sending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {sending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              Configure print product details, pricing, and sizing options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g., 4x6 Photo Print"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Describe the product..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm({ ...productForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="base_price">Base Price (USD) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={productForm.base_price}
                onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                placeholder="9.99"
              />
            </div>

            <div>
              <Label htmlFor="mockup">Mockup Image</Label>
              <Input
                id="mockup"
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadProductImage(e.target.files[0], 'mockup_image_url')}
              />
              {productForm.mockup_image_url && (
                <img src={productForm.mockup_image_url} alt="Mockup" className="mt-2 h-24 object-contain" />
              )}
            </div>

            <div>
              <Label htmlFor="product_img">Product Image</Label>
              <Input
                id="product_img"
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadProductImage(e.target.files[0], 'product_image_url')}
              />
              {productForm.product_image_url && (
                <img src={productForm.product_image_url} alt="Product" className="mt-2 h-24 object-contain" />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sizes & Upcharges</Label>
                <Button type="button" size="sm" onClick={handleAddSize}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Size
                </Button>
              </div>
              {productForm.sizes.map((size, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Size name (e.g., Small, 8x10)"
                    value={size.size_name}
                    onChange={(e) => handleSizeChange(index, 'size_name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Upcharge"
                    value={size.upcharge_amount}
                    onChange={(e) => handleSizeChange(index, 'upcharge_amount', e.target.value)}
                    className="w-24"
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="destructive" 
                    onClick={() => handleRemoveSize(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={productForm.display_order}
                onChange={(e) => setProductForm({ ...productForm, display_order: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={productForm.is_active}
                onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Product is active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProduct}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bug Report Dialog */}
      <Dialog open={showBugDialog} onOpenChange={setShowBugDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-orange-500" />
              Manage Bug Report
            </DialogTitle>
            <DialogDescription>
              Update status, severity, and send a resolution message to the reporter.
            </DialogDescription>
          </DialogHeader>

          {editingBug && (
            <div className="space-y-4">
              {/* Bug Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{editingBug.title}</h3>
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{editingBug.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold">Reporter:</span> {editingBug.reporter_name} ({editingBug.reporter_email})
                  </div>
                  <div>
                    <span className="font-semibold">Page:</span> {editingBug.context_page}
                  </div>
                  <div>
                    <span className="font-semibold">Reported:</span> {format(parseISO(editingBug.created_date), 'PPP')}
                  </div>
                  {editingBug.screenshot_url && (
                    <div className="col-span-2">
                      <a 
                        href={editingBug.screenshot_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 underline"
                      >
                        View Screenshot
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bug_status">Status</Label>
                  <Select
                    value={bugForm.status}
                    onValueChange={(value) => setBugForm({ ...bugForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          Open
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          In Progress
                        </span>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Resolved
                        </span>
                      </SelectItem>
                      <SelectItem value="wont_fix">
                        <span className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          Won't Fix
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bug_severity">Severity</Label>
                  <Select
                    value={bugForm.severity}
                    onValueChange={(value) => setBugForm({ ...bugForm, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resolution Message */}
              <div>
                <Label htmlFor="resolution_msg">Resolution Message (optional)</Label>
                <Textarea
                  id="resolution_msg"
                  value={bugForm.resolutionMessage}
                  onChange={(e) => setBugForm({ ...bugForm, resolutionMessage: e.target.value })}
                  placeholder="Explain what was done to fix this issue or why it won't be fixed..."
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be sent to the reporter if "Send Email" is enabled AND a message is provided.
                </p>
              </div>

              {/* Send Email Toggle */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div>
                  <Label htmlFor="send_email" className="text-sm font-semibold">Send Email Notification</Label>
                  <p className="text-xs text-gray-600">Notify the reporter about this update</p>
                </div>
                <Switch
                  id="send_email"
                  checked={bugForm.sendEmail}
                  onCheckedChange={(checked) => setBugForm({ ...bugForm, sendEmail: checked })}
                />
              </div>

              {/* Previous Resolution (if exists) */}
              {editingBug.resolution_message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-green-900 mb-2">
                    Previous Resolution
                    {editingBug.resolved_date && (
                      <span className="text-xs text-green-700 ml-2">
                        ({format(parseISO(editingBug.resolved_date), 'PPP')})
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">
                    {editingBug.resolution_message}
                  </p>
                  {editingBug.resolved_by_email && (
                    <p className="text-xs text-green-600 mt-2">
                      Resolved by: {editingBug.resolved_by_email}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBugDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolveBug} 
              disabled={resolvingBug}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {resolvingBug ? 'Updating...' : 'Update Bug Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
