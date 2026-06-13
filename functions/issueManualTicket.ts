import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      eventId, 
      attendeeEmail, 
      attendeeName, 
      attendeePhone, 
      quantity,
      notes,
      tableNumber,
      seatNumber
    } = await req.json();

    // Validate inputs
    if (!eventId || !attendeeName || !quantity) {
      return Response.json({ 
        error: 'Missing required fields: eventId, attendeeName, quantity' 
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
      return Response.json({ error: 'Only event hosts can issue tickets' }, { status: 403 });
    }

    // Generate unique ticket code
    const ticketCode = `EPQ-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Generate QR code URL for the ticket code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(ticketCode)}&format=png`;

    // Create ticket record using service role - MATCH ENTITY SCHEMA EXACTLY
    const ticketData = {
      event_id: eventId,
      attendee_email: attendeeEmail || `no-email-${Date.now()}@eventpix.local`,
      attendee_name: attendeeName,
      attendee_phone: attendeePhone || '',
      ticket_code: ticketCode,
      qr_code_url: qrCodeUrl,
      quantity: parseInt(quantity),
      price_paid: event.ticket_price || 0,
      status: 'purchased',
      special_notes: notes || '',
      table_number: tableNumber ? parseInt(tableNumber) : null,
      seat_number: seatNumber ? parseInt(seatNumber) : null
    };

    console.log('[issueManualTicket] Creating ticket with data:', ticketData);

    const ticket = await base44.asServiceRole.entities.Ticket.create(ticketData);

    console.log('[issueManualTicket] Ticket created successfully:', ticket.id);

    // Update tickets sold count
    const newTicketsSold = (event.tickets_sold || 0) + parseInt(quantity);
    await base44.asServiceRole.entities.Event.update(eventId, {
      tickets_sold: newTicketsSold
    });

    console.log('[issueManualTicket] Updated tickets_sold to:', newTicketsSold);

    // Send confirmation email if email is provided
    if (attendeeEmail && !attendeeEmail.includes('@eventpix.local')) {
      try {
        const tableInfo = tableNumber ? `Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''}` : '';
        
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #8B5CF6, #EC4899); padding: 2px; border-radius: 12px;">
            <div style="background: white; border-radius: 10px; padding: 30px;">
              <h1 style="color: #8B5CF6; text-align: center; margin-bottom: 10px;">🎫 Your Ticket Confirmation</h1>
              <h2 style="color: #333; text-align: center; margin-bottom: 30px;">${event.name}</h2>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px 0;">Attendee</p>
                <p style="font-size: 18px; font-weight: bold; color: #111827; margin: 0;">${attendeeName}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <img src="${qrCodeUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; border: 2px solid #8B5CF6; border-radius: 8px; padding: 10px; background: white;" />
                <p style="margin-top: 15px; font-size: 20px; font-weight: bold; color: #8B5CF6;">Ticket Code:</p>
                <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 2px;">${ticketCode}</p>
              </div>

              <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Quantity:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${quantity} ticket(s)</td>
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
          to: attendeeEmail,
          subject: `🎫 Your Ticket for ${event.name}`,
          body: emailBody
        });

        console.log('[issueManualTicket] Confirmation email sent to:', attendeeEmail);
      } catch (emailError) {
        console.error('[issueManualTicket] Failed to send confirmation email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return Response.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_code: ticketCode,
        qr_code_url: qrCodeUrl,
        attendee_name: attendeeName,
        table_number: tableNumber,
        seat_number: seatNumber
      },
      message: 'Ticket issued successfully'
    });

  } catch (error) {
    console.error('[issueManualTicket] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to issue ticket',
      details: error.toString()
    }, { status: 500 });
  }
});