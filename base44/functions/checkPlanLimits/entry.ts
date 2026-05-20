import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAN_LIMITS = {
  gratuito: { users: 1, clients: 50 },
  basico: { users: 5, clients: 500 },
  premium: { users: null, clients: null },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.tenant_id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resource } = await req.json();
    if (!['users', 'clients'].includes(resource)) return Response.json({ error: 'Invalid resource' }, { status: 400 });

    const tenant = await base44.entities.Tenant.filter({ id: user.tenant_id });
    if (tenant.length === 0) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const plan = tenant[0].plan || 'gratuito';
    const limit = PLAN_LIMITS[plan][resource];

    // Unlimited plans
    if (limit === null) {
      return Response.json({ allowed: true, used: 0, limit: null });
    }

    // Count current usage
    let count = 0;
    if (resource === 'users') {
      const users = await base44.entities.User.filter({ tenant_id: user.tenant_id });
      count = users.length;
    } else {
      const clients = await base44.entities.Client.filter({ tenant_id: user.tenant_id });
      count = clients.length;
    }

    const allowed = count < limit;
    return Response.json({
      allowed,
      used: count,
      limit,
      message: allowed ? null : `Limite de ${limit} ${resource} atingido. Upgrade seu plano.`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});