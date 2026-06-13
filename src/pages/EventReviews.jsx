import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, ThumbsUp, Trash2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIES = [
  { id: 'venue', label: '🏛️ Venue', description: 'Location and atmosphere' },
  { id: 'organization', label: '📋 Organization', description: 'Planning and coordination' },
  { id: 'entertainment', label: '🎉 Entertainment', description: 'Activities and fun' },
  { id: 'food', label: '🍽️ Food & Drinks', description: 'Catering and refreshments' }
];

export default function EventReviews() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    categories: { venue: 0, organization: 0, entertainment: 0, food: 0 }
  });
  const [submitting, setSubmitting] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      let user = null;
      try {
        user = await base44.auth.me();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
      
      const eventData = await base44.entities.Event.list();
      const foundEvent = eventData.find(e => e.id === eventId);
      
      if (!foundEvent) {
        navigate(createPageUrl('Home'));
        return;
      }
      
      const userIsHost = user && (foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email));
      setIsHost(userIsHost);
      setEvent(foundEvent);
      
      const reviewsData = await base44.entities.EventReview.filter({ event_id: eventId }, '-created_date');
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!currentUser) {
      const shouldLogin = window.confirm('You need to log in to submit a review. Would you like to log in now?');
      if (shouldLogin) {
        base44.auth.redirectToLogin(window.location.href);
      }
      return;
    }

    if (formData.rating === 0) {
      alert('Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.EventReview.create({
        event_id: eventId,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        rating: formData.rating,
        comment: formData.comment,
        categories: formData.categories,
        is_approved: !event.requires_approval
      });

      setShowSubmitDialog(false);
      setFormData({
        rating: 0,
        comment: '',
        categories: { venue: 0, organization: 0, entertainment: 0, food: 0 }
      });
      alert('✅ Review submitted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
    setSubmitting(false);
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await base44.entities.EventReview.update(reviewId, { is_approved: true });
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, is_approved: true } : r));
    } catch (error) {
      console.error('Error approving review:', error);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Delete this review?')) {
      try {
        await base44.entities.EventReview.delete(reviewId);
        setReviews(reviews.filter(r => r.id !== reviewId));
      } catch (error) {
        console.error('Error deleting review:', error);
      }
    }
  };

  const handleMarkHelpful = async (review) => {
    try {
      await base44.entities.EventReview.update(review.id, {
        helpful_count: (review.helpful_count || 0) + 1
      });
      setReviews(reviews.map(r => r.id === review.id ? { ...r, helpful_count: (r.helpful_count || 0) + 1 } : r));
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onChange && onChange(star)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const calculateAverageRating = () => {
    const approvedReviews = reviews.filter(r => r.is_approved);
    if (approvedReviews.length === 0) return 0;
    const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / approvedReviews.length).toFixed(1);
  };

  const calculateCategoryAverage = (category) => {
    const approvedReviews = reviews.filter(r => r.is_approved && r.categories && r.categories[category]);
    if (approvedReviews.length === 0) return 0;
    const sum = approvedReviews.reduce((acc, r) => acc + (r.categories[category] || 0), 0);
    return (sum / approvedReviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const approvedReviews = reviews.filter(r => r.is_approved);
  const pendingReviews = reviews.filter(r => !r.is_approved);
  const avgRating = calculateAverageRating();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl(`EventGallery?eventId=${eventId}`))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Event Reviews
              </h1>
              <p className="text-gray-600">{event?.name}</p>
            </div>
          </div>
          {!isHost && (
            <Button onClick={() => setShowSubmitDialog(true)} className="bg-gradient-to-r from-purple-600 to-pink-600">
              <Star className="w-4 h-4 mr-2" />
              Write Review
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 text-center">
              <div className="text-5xl font-bold text-purple-600 mb-2">{avgRating}</div>
              {renderStars(Math.round(parseFloat(avgRating)))}
              <p className="text-sm text-gray-500 mt-2">{approvedReviews.length} reviews</p>
            </CardContent>
          </Card>

          {CATEGORIES.map(category => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="text-lg mb-1">{category.label}</div>
                <div className="text-2xl font-bold text-purple-600">{calculateCategoryAverage(category.id)}</div>
                <p className="text-xs text-gray-500">{category.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isHost && pendingReviews.length > 0 && (
          <Card className="mb-8 border-2 border-yellow-400 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Reviews Awaiting Approval ({pendingReviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReviews.map(review => (
                  <div key={review.id} className="p-4 bg-white rounded-lg border-2 border-yellow-400">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{review.user_name}</span>
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveReview(review.id)} className="bg-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteReview(review.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Reviews ({approvedReviews.length})</h2>
          
          {approvedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500">No reviews yet. Be the first to review this event!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {approvedReviews.map(review => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-lg">{review.user_name}</span>
                              {renderStars(review.rating)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(review.created_date), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          {(isHost || review.user_email === currentUser?.email) && (
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteReview(review.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>

                        {review.comment && (
                          <p className="text-gray-700 mb-4">{review.comment}</p>
                        )}

                        {review.categories && Object.keys(review.categories).some(k => review.categories[k] > 0) && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {CATEGORIES.map(category => {
                              const rating = review.categories[category.id];
                              if (!rating) return null;
                              return (
                                <div key={category.id} className="bg-gray-50 p-2 rounded">
                                  <div className="text-xs text-gray-600 mb-1">{category.label}</div>
                                  {renderStars(rating)}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkHelpful(review)}
                            className="text-gray-600"
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Helpful ({review.helpful_count || 0})
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-lg mb-2 block">Overall Rating *</Label>
              <div className="flex gap-2">
                {renderStars(formData.rating, true, (rating) => setFormData({ ...formData, rating }))}
              </div>
            </div>

            <div>
              <Label className="text-lg mb-3 block">Rate by Category</Label>
              <div className="space-y-4">
                {CATEGORIES.map(category => (
                  <div key={category.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs text-gray-500">{category.description}</div>
                    </div>
                    {renderStars(
                      formData.categories[category.id],
                      true,
                      (rating) => setFormData({
                        ...formData,
                        categories: { ...formData.categories, [category.id]: rating }
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Your Review</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Share your experience at this event..."
                rows={6}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting ? 'Submitting...' : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}