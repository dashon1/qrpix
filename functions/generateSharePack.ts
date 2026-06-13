import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Parse request - support both JSON and URL params
    let eventId;
    try {
      const body = await req.json();
      eventId = body.eventId;
    } catch {
      // If JSON parsing fails, try URL params
      const url = new URL(req.url);
      eventId = url.searchParams.get('eventId');
    }
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    const event = events && events.length > 0 ? events[0] : null;
    
    if (!event || !event.name) {
      return new Response(JSON.stringify({ error: 'Event not found or invalid' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Security check: Allow host, co-hosts, AND event attendees based on allow_downloads
    const isHost = event.host_email === user.email;
    const isCoHost = event.co_hosts && event.co_hosts.includes(user.email);
    const allowDownloads = event.allow_downloads === true;
    
    if (!isHost && !isCoHost && !allowDownloads) {
      return new Response(JSON.stringify({ error: 'Forbidden: Downloads are not enabled for this event' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const photos = await base44.asServiceRole.entities.Photo.filter(
      { event_id: eventId },
      '-created_date' // Sort by newest first
    );

    if (photos.length === 0) {
      return new Response(JSON.stringify({ error: 'No photos found to generate a share pack.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const zip = new JSZip();

    // Add a thank you note with summary
    const summary = `Thank you for being a part of ${event.name}!
    
Total Photos: ${photos.length}
Event Date: ${event.start_date ? new Date(event.start_date).toLocaleDateString() : 'N/A'}
Location: ${event.location_address || 'N/A'}

All photos from this amazing event are included in this archive.
Visit: ${event.qr_code_data || 'Event Link'}

Powered by Eventpix QR - Scan. Smile. Capture. Share.`;
    
    zip.file("README.txt", summary);

    // Fetch photos and add them to the zip with better error handling
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout per image
        
        const response = await fetch(photo.image_url, {
          method: 'GET',
          headers: {
            'Accept': 'image/*,video/*',
            'User-Agent': 'Eventpix-Album-Generator/1.0'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          
          // Better file extension detection
          const urlParts = photo.image_url.split('.');
          let fileExtension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
          
          // Fallback to content-type if extension is weird
          if (!fileExtension || fileExtension.length > 5) {
            const contentType = response.headers.get('content-type');
            if (contentType) {
              if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExtension = 'jpg';
              else if (contentType.includes('png')) fileExtension = 'png';
              else if (contentType.includes('gif')) fileExtension = 'gif';
              else if (contentType.includes('webp')) fileExtension = 'webp';
              else if (contentType.includes('mp4')) fileExtension = 'mp4';
              else if (contentType.includes('mov')) fileExtension = 'mov';
              else fileExtension = photo.is_video ? 'mp4' : 'jpg';
            } else {
              fileExtension = photo.is_video ? 'mp4' : 'jpg';
            }
          }
          
          const fileName = `${photo.is_video ? 'video' : 'photo'}_${String(i + 1).padStart(4, '0')}_${photo.id.substring(0, 8)}.${fileExtension}`;
          zip.file(fileName, arrayBuffer);
          successCount++;
        } else {
          console.error(`Failed to fetch photo ${photo.id}: ${response.status} ${response.statusText}`);
          failCount++;
        }
      } catch (error) {
        console.error(`Error fetching photo ${photo.id}:`, error.message);
        failCount++;
      }
      
      // Add a small delay to avoid overwhelming the server
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Downloaded ${successCount} files, failed ${failCount} files`);

    if (successCount === 0) {
      return new Response(JSON.stringify({ error: 'Failed to download any photos' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const zipContent = await zip.generateAsync({ 
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const safeEventName = (event.name || 'event').replace(/[^a-zA-Z0-9]/g, '_');
    
    return new Response(zipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeEventName}_share_pack.zip"`,
        'Content-Length': zipContent.byteLength.toString()
      },
    });

  } catch (error) {
    console.error('Error generating share pack:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});