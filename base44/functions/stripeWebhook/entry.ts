import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Simple in-memory request deduplication
const processedWebhooks = new Set();
const cleanupInterval = 3600000; // 1 hour

setInterval(() => {
  processedWebhooks.clear();
}, cleanupInterval);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify webhook signature first (before any processing)
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await req.text();
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Prevent duplicate processing
    if (processedWebhooks.has(event.id)) {
      console.log(`Webhook ${event.id} already processed`);
      return Response.json({ received: true });
    }
    processedWebhooks.add(event.id);

    const base44 = createClientFromRequest(req);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tenantId = session.metadata?.tenant_id;

      if (!tenantId) {
        console.warn('checkout.session.completed missing tenant_id metadata');
        return Response.json({ received: true });
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer,
          plan: session.metadata.plan || 'basico',
          status: 'ativo',
        });

        console.log(`Tenant ${tenantId} upgraded to plan ${session.metadata.plan}`);
      } catch (err) {
        console.error(`Failed to update tenant ${tenantId}:`, err.message);
        return Response.json({ error: 'Failed to update subscription' }, { status: 500 });
      }
    }

    // Handle customer.subscription.deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;

      if (!tenantId) {
        console.warn('customer.subscription.deleted missing tenant_id metadata');
        return Response.json({ received: true });
      }

      try {
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          plan: 'gratuito',
          stripe_subscription_id: null,
        });

        console.log(`Tenant ${tenantId} downgraded to free plan`);
      } catch (err) {
        console.error(`Failed to downgrade tenant ${tenantId}:`, err.message);
        return Response.json({ error: 'Failed to process cancellation' }, { status: 500 });
      }
    }

    // Handle customer.subscription.updated
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;

      if (!tenantId) {
        console.warn('customer.subscription.updated missing tenant_id metadata');
        return Response.json({ received: true });
      }

      // Check if subscription is in past_due or incomplete
      if (subscription.status === 'past_due' || subscription.status === 'incomplete') {
        try {
          await base44.asServiceRole.entities.Tenant.update(tenantId, {
            status: 'suspenso',
          });
          console.log(`Tenant ${tenantId} suspended due to payment issue`);
        } catch (err) {
          console.error(`Failed to suspend tenant ${tenantId}:`, err.message);
        }
      }

      // Reactivate if payment recovered
      if (subscription.status === 'active') {
        try {
          await base44.asServiceRole.entities.Tenant.update(tenantId, {
            status: 'ativo',
          });
          console.log(`Tenant ${tenantId} reactivated`);
        } catch (err) {
          console.error(`Failed to reactivate tenant ${tenantId}:`, err.message);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});