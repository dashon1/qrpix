import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { BookOpen, Send, Heart } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function GuestbookDialog({ open, onOpenChange, event, currentUser: propUser }) {
  const [entries, setEntries] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(propUser || null);

  // Sync with prop when it changes
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    if (!propUser) {
      loadUser();
    }
    if (open) {
      loadEntries();
    }
  }, [open]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      setCurrentUser(null);
    }
  };

  const loadEntries = async () => {
    try {
      const data = await base44.entities.GuestbookEntry.filter(
        { event_id: event.id, is_approved: true },
        "-created_date"
      );
      setEntries(data);
    } catch (error) {
      console.error("Error loading guestbook:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setLoading(true);
    try {
      await base44.entities.GuestbookEntry.create({
        event_id: event.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        message: newMessage.trim(),
        is_approved: !event.requires_approval
      });
      
      setNewMessage("");
      await loadEntries();
    } catch (error) {
      console.error("Error submitting message:", error);
      alert("Failed to submit message. Please try again.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Event Guestbook
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No messages yet. Be the first to sign the guestbook!
            </p>
          ) : (
            entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{entry.user_name}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(entry.created_date), "MMM d, yyyy")}
                  </span>
                </div>
                <p className="text-gray-700 italic">"{entry.message}"</p>
              </motion.div>
            ))
          )}
        </div>

        {currentUser && (
          <form onSubmit={handleSubmit} className="border-t pt-4">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Leave a message for the event..."
              className="mb-3"
              rows={3}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !newMessage.trim()} className="w-full gap-2">
              <Send className="w-4 h-4" />
              Sign Guestbook
            </Button>
          </form>
        )}

        {!currentUser && (
          <div className="border-t pt-4 text-center">
            <p className="text-gray-600 mb-3">Please log in to sign the guestbook</p>
            <Button onClick={() => base44.auth.redirectToLogin(window.location.href)}>
              Log In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}