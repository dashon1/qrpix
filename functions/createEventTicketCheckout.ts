import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@15.8.0';

Deno.serve(async (req) => {
  console.log('[createEventTicketCheckout] Function invoked');
  
  try {
    // Verify Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error('[createEventTicketCheckout] STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const base44 = createClientFromRequest(req);
    console.log('[createEventTicketCheckout] Base44 client created');
    
    const user = await base44.auth.me();
    console.log('[createEventTicketCheckout] User authenticated:', user?.email);
    
    if (!user) {
      console.error('[createEventTicketCheckout] User not authenticated');
      return new Response(JSON.stringify({ error: 'Please log in to purchase tickets' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const body = await req.json();
    console.log('[createEventTicketCheckout] Request body:', JSON.stringify(body));
    
    const { eventId, quantity = 1 } = body;

    if (!eventId) {
      console.error('[createEventTicketCheckout] Event ID missing');
      return new Response(JSON.stringify({ error: 'Event ID is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Fetch event details
    console.log('[createEventTicketCheckout] Fetching event:', eventId);
    const events = await base44.entities.Event.filter({ id: eventId });
    const event = events[0];

    if (!event) {
      console.error('[createEventTicketCheckout] Event not found:', eventId);
      return new Response(JSON.stringify({ error: 'Event not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!event.is_paid_event) {
      console.error('[createEventTicketCheckout] Event is not a paid event:', eventId);
      return new Response(JSON.stringify({ error: 'This is not a paid event' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    console.log('[createEventTicketCheckout] Event found:', event.name, 'Price:', event.ticket_price);

    // Check ticket availability
    if (event.max_tickets) {
      const remaining = event.max_tickets - (event.tickets_sold || 0);
      console.log('[createEventTicketCheckout] Tickets remaining:', remaining);
      
      if (remaining < quantity) {
        return new Response(JSON.stringify({ error: `Only ${remaining} tickets remaining` }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('?')[0];
    console.log('[createEventTicketCheckout] Origin:', origin);
    
    if (!origin) {
      console.error('[createEventTicketCheckout] Could not determine origin');
      return new Response(JSON.stringify({ error: 'Origin header missing' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Create or get Stripe Price for this event
    let priceId = event.stripe_ticket_price_id;
    
    if (!priceId) {
      console.log('[createEventTicketCheckout] Creating Stripe product and price');
      
      // Create a new Stripe Price for this event
      const product = await stripe.products.create({
        name: `${event.name} - Event Ticket`,
        description: event.ticket_description || `Admission to ${event.name}`,
      });
      console.log('[createEventTicketCheckout] Product created:', product.id);

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(event.ticket_price * 100), // Convert to cents
        currency: 'usd',
      });
      console.log('[createEventTicketCheckout] Price created:', price.id);

      priceId = price.id;

      // Update event with Stripe Price ID
      await base44.asServiceRole.entities.Event.update(eventId, { 
        stripe_ticket_price_id: priceId 
      });
      console.log('[createEventTicketCheckout] Event updated with price ID');
    } else {
      console.log('[createEventTicketCheckout] Using existing price ID:', priceId);
    }

    // Construct URLs
    const successUrl = `${origin}/TicketConfirmation?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/EventGallery?eventId=${eventId}`;
    
    console.log('[createEventTicketCheckout] Success URL:', successUrl);
    console.log('[createEventTicketCheckout] Cancel URL:', cancelUrl);

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        eventId: eventId,
        eventName: event.name,
        quantity: quantity.toString(),
      }
    };

    console.log('[createEventTicketCheckout] Creating Stripe session');
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('[createEventTicketCheckout] Stripe session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[createEventTicketCheckout] Error:', error.message);
    console.error('[createEventTicketCheckout] Stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});