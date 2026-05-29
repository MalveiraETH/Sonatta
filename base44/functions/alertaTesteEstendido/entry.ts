import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['teste_estendido'] === false) return Response.json({ ok: true, skipped: true });

    const clientName = data?.client_name || 'Cliente';
    const testNumber = data?.test_number || event?.entity_id;
    const newEndDate = data?.end_date ? new Date(data.end_date).toLocaleDateString('pt-BR') : '—';

    const msg = `🔄 *TESTE ESTENDIDO*\n\nO teste *${testNumber}* do cliente *${clientName}* foi *estendido*.\n\n📅 Nova data de término: ${newEndDate}\n\nAcompanhe o andamento do teste.`;

    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      app_user_id: adminUserId,
      metadata: { name: `Alerta: Teste Estendido — ${clientName}` }
    });
    await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});