import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Trash2, User, Award, Flag, Sparkles, Send, Download, Film } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import CommentsDialog from "./CommentsDialog";
import ReactionsPopover from "./ReactionsPopover";
import MobileConfirmDialog from "../mobile/MobileConfirmDialog";
import MobileAlertDialog from "../mobile/MobileAlertDialog";

export default function PhotoCard({ photo, onDelete, isHost, contestMode, allowDownloads, showAiDescriptions, allPhotos, onPhotoClick, event }) {
  const [liked, setLiked] = useState(false);
  const [voted, setVoted] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.like_count || 0);
  const [voteCount, setVoteCount] = useState(photo.votes || 0);
  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentCount, setCommentCount] = useState(photo.comment_count || 0);
  const [reactions, setReactions] = useState([]);
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ open: false, title: "", description: "" });

  useEffect(() => {
    loadUser();
    loadReactions();
  }, [photo.id]); // Added photo.id to dependencies to reload reactions if photo changes

  useEffect(() => {
    // Update local state if photo prop changes from parent
    setLikeCount(photo.like_count || 0);
    setVoteCount(photo.votes || 0);
    setCommentCount(photo.comment_count || 0);
  }, [photo.like_count, photo.votes, photo.comment_count]);


  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      await checkIfLiked(user.email);
      if (contestMode) {
        await checkIfVoted(user.email);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setCurrentUser(null); // Ensure currentUser is null if not logged in
    }
  };

  const loadReactions = async () => {
    try {
      const allReactions = await base44.entities.Reaction.filter({ photo_id: photo.id });
      setReactions(allReactions);
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  };

  const checkIfLiked = async (userEmail) => {
    if (!userEmail) return;
    try {
      const likes = await base44.entities.Like.filter({ photo_id: photo.id, user_email: userEmail });
      setLiked(likes.length > 0);
    } catch (error) {
      console.error("Error checking likes:", error);
    }
  };

  const checkIfVoted = async (userEmail) => {
    if (!userEmail) return;
    try {
      const votes = await base44.entities.Vote.filter({ photo_id: photo.id, user_email: userEmail });
      setVoted(votes.length > 0);
    } catch (error) {
      console.error("Error checking votes:", error);
    }
  };

  const handleLike = async () => {
    if (!currentUser || isLiking) return;
    setIsLiking(true);

    // Optimistic update
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (wasLiked) {
        const likes = await base44.entities.Like.filter({ photo_id: photo.id, user_email: currentUser.email });
        if (likes.length > 0) {
          await base44.entities.Like.delete(likes[0].id);
          await base44.entities.Photo.update(photo.id, { like_count: Math.max(0, (photo.like_count || 0) - 1) });
        }
      } else {
        await base44.entities.Like.create({
          photo_id: photo.id,
          user_email: currentUser.email,
          user_name: currentUser.full_name
        });
        await base44.entities.Photo.update(photo.id, { like_count: (photo.like_count || 0) + 1 });
      }
    } catch (error) {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount(prevCount);
      console.error("Error toggling like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async () => {
    if (!currentUser || !contestMode || isVoting) return;
    setIsVoting(true);

    // Optimistic update
    const wasVoted = voted;
    const prevCount = voteCount;
    setVoted(!wasVoted);
    setVoteCount(wasVoted ? prevCount - 1 : prevCount + 1);

    try {
      if (wasVoted) {
        const votes = await base44.entities.Vote.filter({ photo_id: photo.id, user_email: currentUser.email });
        if (votes.length > 0) {
          await base44.entities.Vote.delete(votes[0].id);
          await base44.entities.Photo.update(photo.id, { votes: Math.max(0, (photo.votes || 0) - 1) });
        }
      } else {
        await base44.entities.Vote.create({
          photo_id: photo.id,
          user_email: currentUser.email,
          user_name: currentUser.full_name
        });
        await base44.entities.Photo.update(photo.id, { votes: (photo.votes || 0) + 1 });
      }
    } catch (error) {
      // Revert on failure
      setVoted(wasVoted);
      setVoteCount(prevCount);
      console.error("Error toggling vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDownload = () => {
    if (!allowDownloads) {
      setAlertInfo({ open: true, title: "Downloads Disabled", description: "The event host has restricted photo downloads. Contact the host if you need access." });
      return;
    }
    const link = document.createElement('a');
    link.href = photo.image_url;
    link.download = `QRPix_${photo.id}.${photo.is_video ? 'mp4' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const likes = await base44.entities.Like.filter({ photo_id: photo.id });
      for (const like of likes) {
        try { await base44.entities.Like.delete(like.id); } catch (err) { /* skip */ }
      }
      const comments = await base44.entities.Comment.filter({ photo_id: photo.id });
      for (const comment of comments) {
        try { await base44.entities.Comment.delete(comment.id); } catch (err) { /* skip */ }
      }
      const rxns = await base44.entities.Reaction.filter({ photo_id: photo.id });
      for (const reaction of rxns) {
        try { await base44.entities.Reaction.delete(reaction.id); } catch (err) { /* skip */ }
      }
      const votes = await base44.entities.Vote.filter({ photo_id: photo.id });
      for (const vote of votes) {
        try { await base44.entities.Vote.delete(vote.id); } catch (err) { /* skip */ }
      }
      await onDelete(photo.id);
    } catch (error) {
      console.error("Error deleting photo:", error);
      setAlertInfo({ open: true, title: "Error", description: "Failed to delete photo. Please try again." });
    }
  };

  const handleFlag = async () => {
    if (!currentUser) {
      setAlertInfo({ open: true, title: "Login Required", description: "You must be logged in to flag a photo." });
      return;
    }
    await base44.entities.Photo.update(photo.id, { is_flagged: true });
    setAlertInfo({ open: true, title: "Flagged", description: "Photo flagged for review." });
  };

  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  // Check if current user can delete this photo
  const canDelete = currentUser && (
    photo.uploaded_by === currentUser.email || // User uploaded it
    isHost // Event host can delete any photo
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 ${!photo.is_approved ? 'opacity-50 border-2 border-yellow-400' : ''}`}>
        {!photo.is_approved && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-yellow-400 text-yellow-900">Pending Approval</Badge>
          </div>
        )}
        
        <motion.div 
          className="relative aspect-square bg-gray-100 cursor-pointer"
          onClick={() => onPhotoClick(photo)}
          whileHover={{ scale: 1.02 }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {photo.is_video ? (
            <>
              <video 
                src={photo.image_url} 
                className="w-full h-full object-cover select-none" 
                controls
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="absolute top-2 left-2">
                <Badge className="bg-red-500 text-white gap-1 shadow-lg">
                  <Film className="w-3 h-3" />
                  Video
                </Badge>
              </div>
            </>
          ) : (
            <>
              <img 
                src={photo.image_url} 
                alt={photo.caption || "Event photo"}
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* Sparkle effect on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute top-4 right-4 text-yellow-300"
                >
                  ✨
                </motion.div>
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [360, 180, 0]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 0.5
                  }}
                  className="absolute bottom-4 left-4 text-pink-300"
                >
                  ✨
                </motion.div>
              </motion.div>
            </>
          )}
          
          {photo.ai_tags && photo.ai_tags.length > 0 && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-purple-500/90 text-white gap-1">
                <Sparkles className="w-3 h-3" />
                AI Tagged
              </Badge>
            </div>
          )}

          {contestMode && photo.votes > 0 && ( // Use photo.votes directly for badge display
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-yellow-500/90 text-white gap-1">
                <Award className="w-3 h-3" />
                {photo.votes}
              </Badge>
            </div>
          )}

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {canDelete && (
              <Button
                size="icon"
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="bg-red-500/90 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {!canDelete && currentUser && ( // Only show flag if not deletable by user and user is logged in
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => { e.stopPropagation(); handleFlag(); }}
                className="bg-orange-500/90 hover:bg-orange-600 text-white"
              >
                <Flag className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
        
        <CardContent className="p-4"> {/* Changed div to CardContent */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {photo.uploader_name || "Anonymous"}
            </span>
          </div>
          
          {photo.dedication && (
            <p className="text-gray-800 text-sm mb-3 font-medium italic bg-yellow-100 p-2 rounded-lg flex items-center gap-2">
              <Send className="w-4 h-4 text-yellow-600" /> "{photo.dedication}"
            </p>
          )}

          {photo.caption && (
            <p className="text-gray-600 text-sm mb-3">{photo.caption}</p>
          )}

          {showAiDescriptions && photo.ai_description && (
            <p className="text-gray-500 text-xs mb-3 italic">{photo.ai_description}</p>
          )}

          {photo.ai_tags && photo.ai_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {photo.ai_tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3"> {/* Added justify-between for better spacing of buttons and reactions */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
              >
                <motion.div
                  animate={liked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                </motion.div>
                <span className="font-semibold">{likeCount}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold">{commentCount}</span>
              </motion.button>

              {contestMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVote}
                  className={`gap-2 ${voted ? "text-yellow-500" : "text-gray-600"}`}
                >
                  <Award className={`w-5 h-5 ${voted ? "fill-current" : ""}`} />
                  <span>{voteCount}</span>
                </Button>
              )}

              {allowDownloads && (
                 <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2 text-gray-600"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
              )}
            </div>

            <ReactionsPopover 
              photo={photo}
              currentUser={currentUser}
              onReactionAdded={loadReactions}
            />
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-2">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span key={emoji} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        photo={photo}
        currentUser={currentUser}
        onCommentCountChange={setCommentCount}
      />
      <MobileConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Photo"
        description="Delete this photo/video? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={executeDelete}
      />
      <MobileAlertDialog
        open={alertInfo.open}
        onOpenChange={(v) => setAlertInfo(prev => ({ ...prev, open: v }))}
        title={alertInfo.title}
        description={alertInfo.description}
      />
    </motion.div>
  );
}