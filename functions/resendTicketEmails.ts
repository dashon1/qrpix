import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ 
        error: 'Missing required field: eventId' 
      }, { status: 400 });
    }

    // Get event details using service role
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    const event = events[0];
    
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify user is host or co-host
    const isHost = event.host_email === user.email || event.co_hosts?.includes(user.email);
    if (!isHost) {
      return Response.json({ error: 'Only event hosts can resend ticket emails' }, { status: 403 });
    }

    // Get all tickets for this event
    const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id: eventId });

    console.log(`[resendTicketEmails] Found ${tickets.length} tickets for event ${eventId}`);

    let emailsSent = 0;
    let emailsFailed = 0;
    const failedTickets = [];

    // Send email to each ticket holder with a valid email
    for (const ticket of tickets) {
      // Skip if no valid email
      if (!ticket.attendee_email || ticket.attendee_email.includes('@eventpix.local')) {
        console.log(`[resendTicketEmails] Skipping ticket ${ticket.id} - no valid email`);
        continue;
      }

      try {
        const tableInfo = ticket.table_number 
          ? `Table ${ticket.table_number}${ticket.seat_number ? `, Seat ${ticket.seat_number}` : ''}` 
          : '';
        
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #8B5CF6, #EC4899); padding: 2px; border-radius: 12px;">
            <div style="background: white; border-radius: 10px; padding: 30px;">
              <h1 style="color: #8B5CF6; text-align: center; margin-bottom: 10px;">🎫 Your Ticket Confirmation</h1>
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">${event.name}</h2>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px 0;">Attendee</p>
                <p style="font-size: 18px; font-weight: bold; color: #111827; margin: 0;">${ticket.attendee_name}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <img src="${ticket.qr_code_url}" alt="Ticket QR Code" style="width: 200px; height: 200px; border: 2px solid #8B5CF6; border-radius: 8px; padding: 10px; background: white;" />
                <p style="margin-top: 15px; font-size: 20px; font-weight: bold; color: #8B5CF6;">Ticket Code:</p>
                <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 2px;">${ticket.ticket_code}</p>
              </div>

              <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Quantity:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${ticket.quantity} ticket(s)</td>
                  </tr>
                  ${tableInfo ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Seating:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${tableInfo}</td>
                  </tr>
                  ` : ''}
                  ${event.location_address ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Location:</td>
                    <td style="padding: 8px 0; text-align: right; color: #111827;">${event.location_address}</td>
                  </tr>
                  ` : ''}
                  ${event.start_date ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; text-align: right; color: #111827;">${new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #1e40af;">
                  <strong>📱 Important:</strong> Save this email or take a screenshot of the QR code. You'll need it for check-in at the event!
                </p>
              </div>

              ${event.qr_code_data ? `
              <div style="text-align: center; margin-top: 30px;">
                <a href="${event.qr_code_data}" style="display: inline-block; background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  📸 View Event Gallery
                </a>
              </div>
              ` : ''}

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              
              <p style="text-align: center; color: #6b7280; font-size: 12px; margin: 0;">
                Powered by <strong style="color: #8B5CF6;">Eventpix QR</strong> - Scan. Smile. Capture. Share.
              </p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ticket.attendee_email,
          subject: `🎫 Your Ticket for ${event.name}`,
          body: emailBody
        });

        emailsSent++;
        console.log(`[resendTicketEmails] Email sent to ${ticket.attendee_email} for ticket ${ticket.ticket_code}`);
      } catch (emailError) {
        emailsFailed++;
        failedTickets.push({
          name: ticket.attendee_name,
          email: ticket.attendee_email,
          error: emailError.message
        });
        console.error(`[resendTicketEmails] Failed to send email to ${ticket.attendee_email}:`, emailError);
      }
    }

    console.log(`[resendTicketEmails] Complete - Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return Response.json({
      success: true,
      emailsSent,
      emailsFailed,
      totalTickets: tickets.length,
      failedTickets: failedTickets.length > 0 ? failedTickets : undefined
    });

  } catch (error) {
    console.error('[resendTicketEmails] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to resend ticket emails',
      details: error.toString()
    }, { status: 500 });
  }
});