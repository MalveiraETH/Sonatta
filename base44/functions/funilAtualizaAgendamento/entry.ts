import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const clientId = body?.data?.client_id;
    if (!clientId) return Response.json({ ok: true, skipped: 'no client_id' });

    // Atualiza o funil do cliente para "agendado_novo_teste" apenas se não estiver perdido definitivo
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) return Response.json({ ok: true, skipped: 'client not found' });

    if (client.funil_status === 'perdido_definitivo') {
      return Response.json({ ok: true, skipped: 'status is perdido_definitivo, not overriding' });
    }

    await base44.asServiceRole.entities.Client.update(clientId, {
      funil_status: 'agendado_novo_teste',
    });

    return Response.json({ ok: true, clientId, new_status: 'agendado_novo_teste' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});