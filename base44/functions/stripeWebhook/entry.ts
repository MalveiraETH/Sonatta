import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tenantId = session.metadata?.tenant_id;

      if (tenantId) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer,
          plan: session.metadata.plan,
          status: 'ativo',
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const tenantId = subscription.metadata?.tenant_id;

      if (tenantId) {
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          plan: 'gratuito',
          stripe_subscription_id: null,
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});