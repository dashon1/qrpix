import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  console.log('[registerFreeTicket] Function invoked');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Please log in to register' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const body = await req.json();
    const { eventId, quantity = 1 } = body;

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Fetch event details using service role to ensure we can read it
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    const event = events[0];

    if (!event || !event.is_paid_event) {
      return new Response(JSON.stringify({ error: 'Event not found or is not a ticketed event' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Verify this is actually a free event
    if (event.ticket_price !== 0) {
      return new Response(JSON.stringify({ error: 'This is not a free event. Please use the payment checkout.' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Check ticket availability
    if (event.max_tickets) {
      const remaining = event.max_tickets - (event.tickets_sold || 0);
      if (remaining < quantity) {
        return new Response(JSON.stringify({ error: `Only ${remaining} tickets remaining` }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // Generate unique ticket code
    const ticketCode = `TKT-${eventId.substring(0, 8)}-${Date.now()}`;
    
    // Create ticket record
    await base44.asServiceRole.entities.Ticket.create({
      event_id: eventId,
      attendee_email: user.email,
      attendee_name: user.full_name,
      ticket_code: ticketCode,
      quantity: parseInt(quantity, 10),
      price_paid: 0,
      status: 'purchased',
    });

    // Update event tickets_sold count
    await base44.asServiceRole.entities.Event.update(eventId, {
      tickets_sold: (event.tickets_sold || 0) + parseInt(quantity, 10)
    });

    // Send ticket email
    const ticketUrl = `${Deno.env.get('APP_URL') || req.headers.get('origin') || 'https://your-app.com'}/EventGallery?eventId=${eventId}`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `Your Free Ticket for ${event.name}`,
      body: `
        <h2>Registration Confirmed, ${user.full_name}!</h2>
        <p>You're all set for <strong>${event.name}</strong>!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 24px; font-weight: bold; margin: 0;">Ticket Code:</p>
          <p style="font-size: 32px; font-weight: bold; color: #8B5CF6; margin: 10px 0;">${ticketCode}</p>
          <p style="font-size: 14px; color: #6b7280;">Quantity: ${quantity} ticket(s)</p>
          <p style="font-size: 14px; color: #22c55e; font-weight: bold;">FREE</p>
        </div>
        <p>Present this code at the event entrance or access your ticket here:</p>
        <p><a href="${ticketUrl}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Event</a></p>
        <p>See you at the event!</p>
      `
    });

    console.log(`[registerFreeTicket] Created free ticket ${ticketCode} for event ${eventId}`);

    return new Response(JSON.stringify({ 
      success: true,
      ticketCode: ticketCode 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[registerFreeTicket] Error:', error.message);
    console.error('[registerFreeTicket] Stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});