import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId, photoIds, recipientEmails } = await req.json();

        if (!eventId || !photoIds || photoIds.length === 0) {
            return Response.json({ error: 'Event ID and photo IDs are required' }, { status: 400 });
        }

        // Verify user is host or co-host
        const event = await base44.asServiceRole.entities.Event.list();
        const foundEvent = event.find(e => e.id === eventId);
        
        if (!foundEvent) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        const isHost = foundEvent.host_email === user.email || foundEvent.co_hosts?.includes(user.email);
        if (!isHost) {
            return Response.json({ error: 'Only event hosts can share photos' }, { status: 403 });
        }

        // Fetch selected photos
        const allPhotos = await base44.asServiceRole.entities.Photo.filter({ event_id: eventId });
        const selectedPhotos = allPhotos.filter(p => photoIds.includes(p.id));

        if (selectedPhotos.length === 0) {
            return Response.json({ error: 'No photos found with the provided IDs' }, { status: 404 });
        }

        // Create ZIP file
        const zip = new JSZip();
        
        for (const photo of selectedPhotos) {
            try {
                const response = await fetch(photo.image_url);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                
                // Generate filename
                const extension = photo.is_video ? 'mp4' : 'jpg';
                const fileName = `${photo.uploader_name || 'guest'}_${photo.id.substring(0, 8)}.${extension}`;
                
                zip.file(fileName, arrayBuffer);
            } catch (error) {
                console.error(`Failed to download photo ${photo.id}:`, error);
            }
        }

        // Generate ZIP buffer
        const zipBuffer = await zip.generateAsync({ 
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        // If recipient emails provided, send via email
        if (recipientEmails && recipientEmails.length > 0) {
            // Upload ZIP to temporary storage
            const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
            const zipFile = new File([zipBlob], `${foundEvent.name}_photos.zip`, { type: 'application/zip' });
            
            const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: zipFile });

            // Send emails
            const emailPromises = recipientEmails.map(email => 
                base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: `Photos from ${foundEvent.name}`,
                    body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #8B5CF6;">📸 ${foundEvent.name} - Photo Package</h2>
                            <p>Hello!</p>
                            <p>Thank you for attending ${foundEvent.name}! Please find your curated photo package attached.</p>
                            <p><a href="${file_url}" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">Download Photos</a></p>
                            <p style="color: #666; font-size: 14px;">This package contains ${selectedPhotos.length} photo(s) from the event.</p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                            <p style="color: #999; font-size: 12px;">Powered by Eventpix QR - Scan. Smile. Capture. Share.</p>
                        </div>
                    `
                })
            );

            await Promise.all(emailPromises);

            return Response.json({ 
                success: true, 
                message: `Photo package sent to ${recipientEmails.length} recipient(s)`,
                photoCount: selectedPhotos.length,
                downloadUrl: file_url
            });
        }

        // Otherwise, return ZIP for direct download
        return new Response(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${foundEvent.name}_selected_photos.zip"`
            }
        });
    } catch (error) {
        console.error('Error in shareSelectedPhotos:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});