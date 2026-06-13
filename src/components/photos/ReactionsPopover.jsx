import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { Reaction } from "@/entities/all";

const EMOJI_OPTIONS = ["❤️", "😂", "😮", "🔥", "👏", "🎉", "💯"];

export default function ReactionsPopover({ photo, currentUser, onReactionAdded }) {
  const [open, setOpen] = useState(false);

  const handleReaction = async (emoji) => {
    if (!currentUser) return;

    // Check if user already reacted with this emoji
    const existing = await Reaction.filter({
      photo_id: photo.id,
      user_email: currentUser.email,
      emoji: emoji
    });

    if (existing.length > 0) {
      // Remove reaction
      await Reaction.delete(existing[0].id);
    } else {
      // Add reaction
      await Reaction.create({
        photo_id: photo.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        emoji: emoji
      });
    }

    setOpen(false);
    onReactionAdded();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-gray-600">
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}