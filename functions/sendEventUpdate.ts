import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper function to add delay between emails
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId, updateTitle, updateMessage } = await req.json();

        if (!eventId || !updateTitle || !updateMessage) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get the event
        const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
        const event = events[0];

        if (!event) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check if user is host or co-host
        const isHost = event.host_email === user.email || event.co_hosts?.includes(user.email);
        if (!isHost) {
            return Response.json({ error: 'Only event hosts can send updates' }, { status: 403 });
        }

        // Collect all unique emails from various sources
        const emailSet = new Set();

        // 1. Get emails from tickets
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id: eventId });
        tickets.forEach(ticket => {
            if (ticket.attendee_email) emailSet.add(ticket.attendee_email);
        });

        // 2. Get emails from photos
        const photos = await base44.asServiceRole.entities.Photo.filter({ event_id: eventId });
        photos.forEach(photo => {
            if (photo.uploaded_by) emailSet.add(photo.uploaded_by);
        });

        // 3. Get emails from guestbook entries
        const guestbookEntries = await base44.asServiceRole.entities.GuestbookEntry.filter({ event_id: eventId });
        guestbookEntries.forEach(entry => {
            if (entry.user_email) emailSet.add(entry.user_email);
        });

        const uniqueEmails = Array.from(emailSet);

        if (uniqueEmails.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'No attendees found to notify',
                emailsSent: 0 
            });
        }

        // Create update email
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #faf5ff, #fce7f3); padding: 20px; border-radius: 12px;">
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${event.cover_image_url ? `
                        <div style="width: 100%; height: 200px; overflow: hidden;">
                            <img src="${event.cover_image_url}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                    ` : ''}
                    
                    <div style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="display: inline-block; background: linear-gradient(to right, #8B5CF6, #EC4899); padding: 8px 16px; border-radius: 20px; margin-bottom: 15px;">
                                <span style="color: white; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">📢 Event Update</span>
                            </div>
                            <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
                                ${updateTitle}
                            </h1>
                            <h2 style="color: #6b7280; font-size: 18px; margin: 0;">
                                ${event.name}
                            </h2>
                        </div>
                        
                        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-wrap;">
                                ${updateMessage}
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${event.qr_code_data}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                                📸 View Event Gallery
                            </a>
                        </div>
                        
                        ${event.location_address ? `
                            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>📍 Location:</strong> ${event.location_address}
                                </p>
                            </div>
                        ` : ''}
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                        
                        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                            Update sent by ${user.full_name} (${user.email})
                        </p>
                    </div>
                </div>
                
                <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                    Powered by <strong style="color: #8B5CF6;">Eventpix QR</strong>
                </p>
            </div>
        `;

        // Send emails to all unique attendees
        let successCount = 0;
        let failCount = 0;

        for (const email of uniqueEmails) {
            try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: `📢 Update: ${updateTitle} - ${event.name}`,
                    body: emailBody
                });
                successCount++;
                
                // Add 200ms delay between emails to avoid rate limiting
                await delay(200);
            } catch (error) {
                console.error(`Failed to send update email to ${email}:`, error);
                failCount++;
            }
        }

        // Log the update in the database
        await base44.asServiceRole.entities.EventUpdate.create({
            event_id: eventId,
            update_title: updateTitle,
            update_message: updateMessage,
            sent_by_email: user.email,
            sent_by_name: user.full_name,
            recipients_count: uniqueEmails.length,
            emails_sent: successCount,
            emails_failed: failCount
        });

        return Response.json({
            success: true,
            message: `Update sent successfully`,
            emailsSent: successCount,
            emailsFailed: failCount,
            totalRecipients: uniqueEmails.length
        });

    } catch (error) {
        console.error('Error sending event update:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});