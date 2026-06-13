import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@15.8.0';

Deno.serve(async (req) => {
  console.log('[createStripeCheckout] Function invoked');
  
  try {
    // Verify Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error('[createStripeCheckout] STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const base44 = createClientFromRequest(req);
    console.log('[createStripeCheckout] Base44 client created');
    
    const user = await base44.auth.me();
    console.log('[createStripeCheckout] User authenticated:', user?.email);
    
    if (!user) {
      console.error('[createStripeCheckout] User not authenticated');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const body = await req.json();
    console.log('[createStripeCheckout] Request body:', JSON.stringify(body));
    
    const { priceId, credits, planName, packName, monthlyCredits } = body;

    if (!priceId) {
      console.error('[createStripeCheckout] Price ID missing');
      return new Response(JSON.stringify({ error: 'Price ID is required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const stripe = new Stripe(stripeKey);
    console.log('[createStripeCheckout] Stripe client initialized');
    
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('?')[0];
    console.log('[createStripeCheckout] Origin:', origin);
    
    if (!origin) {
      console.error('[createStripeCheckout] Could not determine origin');
      return new Response(JSON.stringify({ error: 'Origin header missing' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Construct success and cancel URLs
    const successUrl = `${origin}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/PaymentCancel`;
    
    console.log('[createStripeCheckout] Success URL:', successUrl);
    console.log('[createStripeCheckout] Cancel URL:', cancelUrl);

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: planName ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        userEmail: user.email,
      }
    };

    // Add credits metadata for one-time purchases
    if (credits) {
      sessionConfig.metadata.credits = credits.toString();
      sessionConfig.metadata.packName = packName || 'Credit Pack';
      console.log('[createStripeCheckout] One-time purchase - Credits:', credits);
    }

    // Add plan metadata for subscriptions
    if (planName) {
      sessionConfig.metadata.planName = planName;
      sessionConfig.metadata.monthlyCredits = monthlyCredits?.toString() || '0';
      console.log('[createStripeCheckout] Subscription - Plan:', planName, 'Credits:', monthlyCredits);
    }

    console.log('[createStripeCheckout] Creating Stripe session with config:', JSON.stringify({
      ...sessionConfig,
      line_items: sessionConfig.line_items
    }));

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('[createStripeCheckout] Stripe session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[createStripeCheckout] Error:', error.message);
    console.error('[createStripeCheckout] Stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});