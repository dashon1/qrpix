import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Calendar, Trash2, Edit, Image as ImageIcon, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-sky-500' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' }
];

export default function SocialMediaManager() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    post_content: '',
    platforms: [],
    scheduled_time: '',
    image_url: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
      
      const postsData = await base44.entities.SocialPost.filter({ event_id: eventId }, '-created_date');
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingPost(null);
    setFormData({
      post_content: '',
      platforms: [],
      scheduled_time: '',
      image_url: ''
    });
    setImageFile(null);
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setFormData({
      post_content: post.post_content,
      platforms: post.platforms,
      scheduled_time: post.scheduled_time ? format(new Date(post.scheduled_time), "yyyy-MM-dd'T'HH:mm") : '',
      image_url: post.image_url || ''
    });
    setImageFile(null);
    setShowCreateDialog(true);
  };

  const handleSavePost = async () => {
    if (!formData.post_content.trim()) {
      alert('Please enter post content');
      return;
    }
    
    if (formData.platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = formData.image_url;
      
      if (imageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = file_url;
      }

      const postData = {
        event_id: eventId,
        post_content: formData.post_content,
        platforms: formData.platforms,
        scheduled_time: formData.scheduled_time ? new Date(formData.scheduled_time).toISOString() : null,
        image_url: imageUrl,
        status: formData.scheduled_time ? 'scheduled' : 'draft'
      };

      if (editingPost) {
        await base44.entities.SocialPost.update(editingPost.id, postData);
      } else {
        await base44.entities.SocialPost.create(postData);
      }

      setShowCreateDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    }
    setSaving(false);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Delete this post?')) {
      try {
        await base44.entities.SocialPost.delete(postId);
        setPosts(posts.filter(p => p.id !== postId));
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleTogglePlatform = (platformId) => {
    const platforms = formData.platforms.includes(platformId)
      ? formData.platforms.filter(p => p !== platformId)
      : [...formData.platforms, platformId];
    setFormData({ ...formData, platforms });
  };

  const getStatusBadge = (post) => {
    const statusColors = {
      draft: 'bg-gray-200 text-gray-800',
      scheduled: 'bg-blue-200 text-blue-800',
      posted: 'bg-green-200 text-green-800',
      failed: 'bg-red-200 text-red-800'
    };
    
    return (
      <Badge className={statusColors[post.status]}>
        {post.status.toUpperCase()}
      </Badge>
    );
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl(`ManageEvent?eventId=${eventId}`))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Social Media Manager
              </h1>
              <p className="text-gray-600">{event?.name}</p>
            </div>
          </div>
          <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-purple-600 to-pink-600">
            <Send className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {PLATFORMS.map(platform => {
            const platformPosts = posts.filter(p => p.platforms.includes(platform.id));
            return (
              <Card key={platform.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="font-semibold">{platform.name}</span>
                  </div>
                  <div className="text-2xl font-bold">{platformPosts.length}</div>
                  <p className="text-xs text-gray-500">Posts</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">All Posts ({posts.length})</h2>
          
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500">No posts yet. Create your first social media post!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <AnimatePresence>
                {posts.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(post)}
                              {post.scheduled_time && (
                                <Badge variant="outline">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {format(new Date(post.scheduled_time), 'MMM d, h:mm a')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2 mb-2">
                              {post.platforms.map(platformId => {
                                const platform = PLATFORMS.find(p => p.id === platformId);
                                return (
                                  <span key={platformId} className="text-lg">
                                    {platform?.icon}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(post)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeletePost(post.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {post.image_url && (
                          <img src={post.image_url} alt="Post" className="w-full h-40 object-cover rounded-lg mb-3" />
                        )}
                        <p className="text-sm whitespace-pre-wrap">{post.post_content}</p>
                        {post.error_message && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                            Error: {post.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create Social Media Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Post Content *</Label>
              <Textarea
                value={formData.post_content}
                onChange={(e) => setFormData({ ...formData, post_content: e.target.value })}
                placeholder="Write your post content here..."
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.post_content.length} characters
              </p>
            </div>

            <div>
              <Label>Select Platforms *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {PLATFORMS.map(platform => (
                  <div
                    key={platform.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.platforms.includes(platform.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTogglePlatform(platform.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formData.platforms.includes(platform.id)} />
                      <span className="text-xl">{platform.icon}</span>
                      <span className="font-medium">{platform.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Schedule Post (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to save as draft
              </p>
            </div>

            <div>
              <Label>Add Image (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="mt-2"
              />
              {(formData.image_url || imageFile) && (
                <div className="mt-2">
                  {imageFile ? (
                    <p className="text-sm text-green-600">✓ New image selected</p>
                  ) : formData.image_url ? (
                    <img src={formData.image_url} alt="Current" className="w-full h-32 object-cover rounded" />
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSavePost} disabled={saving}>
              {saving ? 'Saving...' : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {editingPost ? 'Update' : 'Create'} Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}