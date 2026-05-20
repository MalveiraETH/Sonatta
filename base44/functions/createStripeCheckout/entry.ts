import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLANS = {
  basico: { price: 9900, name: 'Plano Básico', interval: 'month' },
  premium: { price: 29900, name: 'Plano Premium', interval: 'month' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan } = await req.json();
    if (!PLANS[plan]) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    // Get tenant
    const tenant = await base44.entities.Tenant.filter({ id: user.tenant_id });
    if (tenant.length === 0) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const tenantData = tenant[0];

    // Create or get Stripe customer
    let customerId = tenantData.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenantData.email || user.email,
        name: tenantData.name,
        metadata: { tenant_id: user.tenant_id }
      });
      customerId = customer.id;
      await base44.entities.Tenant.update(user.tenant_id, { stripe_customer_id: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: PLANS[plan].name,
              description: `Assinatura ${PLANS[plan].name}`,
            },
            unit_amount: PLANS[plan].price,
            recurring: {
              interval: PLANS[plan].interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/billing`,
      metadata: {
        tenant_id: user.tenant_id,
        plan: plan,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});