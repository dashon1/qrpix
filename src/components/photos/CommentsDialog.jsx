import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Comment, Photo } from "@/entities/all";
import { Send, User } from "lucide-react";
import { format } from "date-fns";

export default function CommentsDialog({ open, onOpenChange, photo, currentUser, onCommentCountChange }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open]);

  const loadComments = async () => {
    const data = await Comment.filter({ photo_id: photo.id }, "-created_date");
    setComments(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setLoading(true);
    await Comment.create({
      photo_id: photo.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      text: newComment.trim()
    });

    const newCount = comments.length + 1;
    await Photo.update(photo.id, { comment_count: newCount });
    onCommentCountChange(newCount);

    setNewComment("");
    await loadComments();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_date), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}