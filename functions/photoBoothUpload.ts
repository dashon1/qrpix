import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request
    const { eventId, apiKey, imageData, uploaderName } = await req.json();
    
    if (!eventId || !apiKey || !imageData) {
      return Response.json(
        { error: 'Missing required fields: eventId, apiKey, imageData' }, 
        { status: 400 }
      );
    }
    
    // Verify event exists and API key matches
    const events = await base44.asServiceRole.entities.Event.list();
    const event = events.find(e => e.id === eventId && e.photo_booth_api_key === apiKey);
    
    if (!event) {
      return Response.json(
        { error: 'Invalid event ID or API key' }, 
        { status: 401 }
      );
    }
    
    // Convert base64 image to file
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    
    // Upload file
    const formData = new FormData();
    formData.append('file', blob, `photobooth_${Date.now()}.jpg`);
    
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({ 
      file: blob 
    });
    
    // Create photo record
    const photo = await base44.asServiceRole.entities.Photo.create({
      event_id: eventId,
      image_url: uploadResponse.file_url,
      is_video: false,
      uploaded_by: 'photo_booth@system',
      uploader_name: uploaderName || 'Photo Booth',
      upload_source: 'photo_booth',
      like_count: 0,
      comment_count: 0,
      is_approved: !event.requires_approval
    });
    
    // Update photo count
    await base44.asServiceRole.entities.Event.update(eventId, { 
      photo_count: (event.photo_count || 0) + 1 
    });
    
    return Response.json({ 
      success: true, 
      photoId: photo.id,
      message: 'Photo uploaded successfully from photo booth'
    });
    
  } catch (error) {
    console.error('Photo booth upload error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});