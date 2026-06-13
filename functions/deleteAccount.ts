import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    const userId = user.id;

    // Delete all events hosted by this user and their associated data
    try {
      const userEvents = await base44.asServiceRole.entities.Event.filter({ host_email: userEmail });
      
      for (const event of userEvents) {
        // Delete photos for each event
        try {
          const photos = await base44.asServiceRole.entities.Photo.filter({ event_id: event.id });
          for (const photo of photos) {
            try { await base44.asServiceRole.entities.Like.filter({ photo_id: photo.id }).then(likes => Promise.all(likes.map(l => base44.asServiceRole.entities.Like.delete(l.id)))); } catch(e) {}
            try { await base44.asServiceRole.entities.Comment.filter({ photo_id: photo.id }).then(comments => Promise.all(comments.map(c => base44.asServiceRole.entities.Comment.delete(c.id)))); } catch(e) {}
            try { await base44.asServiceRole.entities.Photo.delete(photo.id); } catch(e) {}
          }
        } catch(e) {}
        
        // Delete guestbook entries
        try {
          const entries = await base44.asServiceRole.entities.GuestbookEntry.filter({ event_id: event.id });
          for (const entry of entries) { try { await base44.asServiceRole.entities.GuestbookEntry.delete(entry.id); } catch(e) {} }
        } catch(e) {}
        
        // Delete the event itself
        try { await base44.asServiceRole.entities.Event.delete(event.id); } catch(e) {}
      }
    } catch(e) {
      console.log("Error cleaning up events:", e.message);
    }

    // Delete the user record using service role
    try {
      await base44.asServiceRole.entities.User.delete(userId);
    } catch(e) {
      console.log("Error deleting user record:", e.message);
    }

    return Response.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});