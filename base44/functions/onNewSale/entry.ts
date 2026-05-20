import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (body.event.type !== 'create') return Response.json({ ok: true });

    const saleData = body.data;
    const users = await base44.asServiceRole.entities.User.filter({ 
      tenant_id: saleData.tenant_id, 
      role: 'admin' 
    });

    for (const user of users) {
      await base44.asServiceRole.functions.invoke('sendNotificationEmail', {
        template: 'new_sale',
        to: user.email,
        data: [user.full_name, saleData.sale_number, saleData.client_name, saleData.total],
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});