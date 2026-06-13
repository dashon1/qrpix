import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Upload, AlertCircle } from "lucide-react";

export default function BugReportDialog({ open, onOpenChange, currentPageName }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    screenshot: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please provide both a title and description');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const user = await base44.auth.me();
      
      let screenshotUrl = null;
      if (formData.screenshot) {
        const { file_url } = await base44.integrations.Core.UploadFile({ 
          file: formData.screenshot 
        });
        screenshotUrl = file_url;
      }

      await base44.entities.BugReport.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        reporter_email: user.email,
        reporter_name: user.full_name || user.email,
        context_page: currentPageName || 'Unknown',
        screenshot_url: screenshotUrl,
        status: 'open',
        severity: 'medium'
      });

      // Reset form
      setFormData({ title: '', description: '', screenshot: null });
      
      alert('✅ Thank you! Your bug report has been submitted successfully. We\'ll review it and get back to you.');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setError('Failed to submit bug report. Please try again.');
    }

    setSubmitting(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Screenshot must be less than 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, screenshot: file }));
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Report a Bug or Issue
          </DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs, issues, or suggestions. Your feedback is invaluable!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bug-title">Title / Summary *</Label>
            <Input
              id="bug-title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="bug-description">Detailed Description *</Label>
            <Textarea
              id="bug-description"
              placeholder="Describe what went wrong or what you'd like to see... Include steps to reproduce if possible."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="bug-screenshot">Screenshot (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bug-screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <Upload className="w-4 h-4 text-gray-400" />
            </div>
            {formData.screenshot && (
              <p className="text-xs text-gray-600 mt-1">
                ✓ {formData.screenshot.name} ({(formData.screenshot.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">📍 Context Information:</p>
            <p className="text-xs">Current Page: <span className="font-mono">{currentPageName || 'Unknown'}</span></p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}