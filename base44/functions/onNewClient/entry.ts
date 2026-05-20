import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (body.event.type !== 'create') return Response.json({ ok: true });

    const clientData = body.data;
    const tenant = await base44.asServiceRole.entities.Tenant.filter({ id: clientData.tenant_id });
    if (tenant.length === 0) return Response.json({ ok: true });

    // Get admin user(s) of tenant
    const users = await base44.asServiceRole.entities.User.filter({ 
      tenant_id: clientData.tenant_id, 
      role: 'admin' 
    });

    for (const user of users) {
      await base44.asServiceRole.functions.invoke('sendNotificationEmail', {
        template: 'new_client',
        to: user.email,
        data: [user.full_name, clientData.full_name],
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});