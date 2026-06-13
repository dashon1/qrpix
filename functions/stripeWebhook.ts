import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@15.8.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.warn("STRIPE_WEBHOOK_SECRET is not set.");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log('[Webhook] Received event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const credits = session.metadata.credits;
      const planName = session.metadata.planName;
      const monthlyCredits = session.metadata.monthlyCredits;
      const eventId = session.metadata.eventId;
      const quantity = session.metadata.quantity;

      console.log('[Webhook] Session metadata:', session.metadata);

      // Handle Event Ticket Purchase
      if (eventId) {
        const ticketCode = `TKT-${eventId.substring(0, 8)}-${Date.now()}`;
        const attendeeEmail = session.metadata.userEmail;
        const attendeeName = session.metadata.userName;
        const eventName = session.metadata.eventName;
        
        // Create ticket record
        await base44.asServiceRole.entities.Ticket.create({
          event_id: eventId,
          attendee_email: attendeeEmail,
          attendee_name: attendeeName,
          ticket_code: ticketCode,
          quantity: parseInt(quantity, 10),
          price_paid: session.amount_total / 100,
          status: 'purchased',
          stripe_payment_intent: session.payment_intent,
        });

        // Update event tickets_sold count
        const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
        const currentEvent = events[0];
        if (currentEvent) {
          await base44.asServiceRole.entities.Event.update(eventId, {
            tickets_sold: (currentEvent.tickets_sold || 0) + parseInt(quantity, 10)
          });
        }

        // Send ticket email
        const ticketUrl = `${Deno.env.get('APP_URL') || 'https://your-app.com'}/EventGallery?eventId=${eventId}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: attendeeEmail,
          subject: `Your Ticket for ${eventName}`,
          body: `
            <h2>Thank you for your purchase, ${attendeeName}!</h2>
            <p>Your ticket for <strong>${eventName}</strong> has been confirmed.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 24px; font-weight: bold; margin: 0;">Ticket Code:</p>
              <p style="font-size: 32px; font-weight: bold; color: #8B5CF6; margin: 10px 0;">${ticketCode}</p>
              <p style="font-size: 14px; color: #6b7280;">Quantity: ${quantity} ticket(s)</p>
            </div>
            <p>Present this code at the event entrance or access your ticket here:</p>
            <p><a href="${ticketUrl}" style="background: linear-gradient(to right, #8B5CF6, #EC4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Event</a></p>
            <p>See you at the event!</p>
          `
        });

        console.log(`[Webhook] Created ticket ${ticketCode} for event ${eventId}`);
      }

      // Handle Credit Purchase (existing logic)
      if (userId && credits) {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const user = users[0];
        
        if (user) {
          const creditsPurchased = parseInt(credits, 10);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          
          const newCredits = (user.credits || 0) + creditsPurchased;
          await base44.asServiceRole.entities.User.update(userId, { 
            credits: newCredits,
            credits_expire_at: expiresAt.toISOString()
          });
          console.log(`[Webhook] Added ${creditsPurchased} credits to user ${userId}. New balance: ${newCredits}`);
        }
      }

      // Handle Subscription (existing logic)
      if (userId && planName && monthlyCredits) {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const user = users[0];
        
        if (user) {
          const monthlyCreditsInt = parseInt(monthlyCredits, 10);
          const resetDate = new Date();
          resetDate.setMonth(resetDate.getMonth() + 1);
          
          await base44.asServiceRole.entities.User.update(userId, { 
            subscription_plan: planName,
            credits: monthlyCreditsInt,
            monthly_credit_reset_date: resetDate.toISOString()
          });
          console.log(`[Webhook] Updated user ${userId} to ${planName} plan with ${monthlyCreditsInt} credits`);
        }
      }
    }

    // Handle subscription cancellation (existing logic)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerEmail = subscription.customer_email;
      
      if (customerEmail) {
        const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
        const user = users[0];
        
        if (user) {
          await base44.asServiceRole.entities.User.update(user.id, { 
            subscription_plan: 'free',
            credits: 0
          });
          console.log(`[Webhook] Downgraded user ${user.id} to free plan`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(`[Webhook] Error: ${err.message}`);
    return new Response(JSON.stringify({ error: `Webhook error: ${err.message}` }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});