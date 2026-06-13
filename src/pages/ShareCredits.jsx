import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function ShareCredits() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [creditsToSend, setCreditsToSend] = useState(2);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Check if user has Pro or Business plan
      if (currentUser.subscription_plan !== 'pro' && currentUser.subscription_plan !== 'business') {
        navigate(createPageUrl('Home'));
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate(createPageUrl('Home'));
    }
    setLoading(false);
  };

  const handleSendCredits = async (e) => {
    e.preventDefault();
    
    if (creditsToSend < 2) {
      alert('You must send at least 2 credits (1 event)');
      return;
    }
    
    if (creditsToSend > user.credits) {
      alert('You don\'t have enough credits to send');
      return;
    }
    
    if (!recipientEmail) {
      alert('Please enter a recipient email');
      return;
    }
    
    setSending(true);
    
    try {
      // Find recipient user
      const allUsers = await base44.entities.User.list();
      const recipient = allUsers.find(u => u.email === recipientEmail);
      
      if (!recipient) {
        alert('Recipient not found. They must have an Eventpix QR account.');
        setSending(false);
        return;
      }
      
      // Deduct credits from sender
      await base44.auth.updateMe({ credits: user.credits - creditsToSend });
      
      // Add credits to recipient
      await base44.entities.User.update(recipient.id, { 
        credits: (recipient.credits || 0) + creditsToSend 
      });
      
      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `You received ${creditsToSend} Eventpix QR credits!`,
        body: `
          <h2>You've Got Credits! 🎉</h2>
          <p><strong>${user.full_name}</strong> (${user.email}) has sent you <strong>${creditsToSend} credits</strong> for Eventpix QR!</p>
          <p>You can now use these credits to create ${creditsToSend / 2} event${creditsToSend > 2 ? 's' : ''}.</p>
          <p>Log in to your account to start creating: <a href="${window.location.origin}${createPageUrl('Home')}">Go to Eventpix QR</a></p>
        `
      });
      
      alert(`Successfully sent ${creditsToSend} credits to ${recipientEmail}!`);
      setRecipientEmail('');
      setCreditsToSend(2);
      await loadUser();
      
    } catch (error) {
      console.error('Error sending credits:', error);
      alert('Failed to send credits. Please try again.');
    }
    
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('Home'))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-xl border-2 border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Share Credits
              </CardTitle>
              <CardDescription className="text-purple-100">
                Send credits to friends, family, or team members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Your Available Credits</p>
                <p className="text-3xl font-bold text-purple-600">{user.credits} credits</p>
                <p className="text-xs text-gray-500 mt-1">= {user.credits / 2} events</p>
              </div>
              
              <form onSubmit={handleSendCredits} className="space-y-6">
                <div>
                  <Label htmlFor="recipient">Recipient Email</Label>
                  <Input
                    id="recipient"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="friend@example.com"
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The recipient must have an Eventpix QR account
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="credits">Credits to Send</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="2"
                    step="2"
                    max={user.credits}
                    value={creditsToSend}
                    onChange={(e) => setCreditsToSend(parseInt(e.target.value))}
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 2 credits (1 event). Must be an even number.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    📧 <strong>Email Notification:</strong> The recipient will receive an email notification when you send credits.
                  </p>
                </div>
                
                <Button
                  type="submit"
                  disabled={sending || creditsToSend > user.credits}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg h-12 gap-2"
                >
                  {sending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send {creditsToSend} Credits
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}