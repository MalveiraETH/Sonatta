import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAN_LIMITS = {
  gratuito: { users: 1, clients: 50, storage_gb: 1 },
  basico: { users: 5, clients: 500, storage_gb: 10 },
  premium: { users: null, clients: null, storage_gb: 100 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.tenant_id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await base44.entities.Tenant.filter({ id: user.tenant_id });
    if (tenant.length === 0) return Response.json({ error: 'Tenant not found' }, { status: 404 });

    const tenantData = tenant[0];
    const plan = tenantData.plan || 'gratuito';
    const limits = PLAN_LIMITS[plan];

    // Count users
    const users = await base44.entities.User.filter({ tenant_id: user.tenant_id });
    const usersCount = users.length;

    // Count clients
    const clients = await base44.entities.Client.filter({ tenant_id: user.tenant_id });
    const clientsCount = clients.length;

    // Estimate storage (rough estimate based on records)
    const [sales, appointments, products, expenses] = await Promise.all([
      base44.entities.Sale.filter({ tenant_id: user.tenant_id }),
      base44.entities.Appointment.filter({ tenant_id: user.tenant_id }),
      base44.entities.Product.filter({ tenant_id: user.tenant_id }),
      base44.entities.Expense.filter({ tenant_id: user.tenant_id }),
    ]);

    const estimatedStorageGb = (
      (usersCount + clientsCount + sales.length + appointments.length + products.length + expenses.length) * 0.0001
    ).toFixed(2);

    return Response.json({
      plan,
      limits,
      usage: {
        users: usersCount,
        clients: clientsCount,
        storage_gb: parseFloat(estimatedStorageGb),
      },
      percentages: {
        users: limits.users ? Math.round((usersCount / limits.users) * 100) : 0,
        clients: limits.clients ? Math.round((clientsCount / limits.clients) * 100) : 0,
        storage: Math.round((parseFloat(estimatedStorageGb) / limits.storage_gb) * 100),
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});