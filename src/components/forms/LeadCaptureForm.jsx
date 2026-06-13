import React, { useState } from 'react';
import { Lead } from '@/entities/Lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function LeadCaptureForm({ source, onSuccess }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Lead.create({ ...formData, source });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Lead submission failed:", error);
      alert("There was an error submitting your request. Please try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-xl font-bold text-green-800">Thank You!</h3>
        <p className="text-green-700 mt-2">We've received your message and will be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1"
        />
      </div>
       <div>
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          className="mt-1"
          rows={4}
        />
      </div>
      <div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Submitting...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}