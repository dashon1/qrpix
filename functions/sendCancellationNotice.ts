import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId, cancellationMessage } = await req.json();

        if (!eventId || !cancellationMessage) {
            return Response.json({ error: 'Missing eventId or cancellationMessage' }, { status: 400 });
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
            return Response.json({ error: 'Only event hosts can send cancellation notices' }, { status: 403 });
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

        // Create cancellation email
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #fef2f2, #fee2e2); padding: 20px; border-radius: 12px;">
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${event.cover_image_url ? `
                        <div style="width: 100%; height: 200px; overflow: hidden;">
                            <img src="${event.cover_image_url}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.6; filter: grayscale(100%);" />
                        </div>
                    ` : ''}
                    
                    <div style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #dc2626; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
                                Event Cancelled
                            </h1>
                            <h2 style="color: #374151; font-size: 22px; margin: 0 0 10px 0;">
                                ${event.name}
                            </h2>
                        </div>
                        
                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 4px; margin: 20px 0;">
                            <p style="color: #991b1b; font-size: 16px; margin: 0; line-height: 1.6;">
                                <strong>⚠️ Important Notice:</strong> We regret to inform you that this event has been cancelled.
                            </p>
                        </div>
                        
                        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                                📝 Message from the Host:
                            </h3>
                            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                                ${cancellationMessage}
                            </p>
                        </div>
                        
                        ${event.location_address ? `
                            <div style="margin: 20px 0;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                    <strong>Original Location:</strong> ${event.location_address}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
                            <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
                                <strong>💡 Note:</strong> If you purchased tickets, you will receive a separate email regarding refunds. For questions, please contact the event organizer directly.
                            </p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                        
                        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                            This cancellation notice was sent by ${user.full_name} (${user.email})
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
                    subject: `❌ Event Cancelled: ${event.name}`,
                    body: emailBody
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to send cancellation email to ${email}:`, error);
                failCount++;
            }
        }

        return Response.json({
            success: true,
            message: `Cancellation notices sent successfully`,
            emailsSent: successCount,
            emailsFailed: failCount,
            totalRecipients: uniqueEmails.length
        });

    } catch (error) {
        console.error('Error sending cancellation notice:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});