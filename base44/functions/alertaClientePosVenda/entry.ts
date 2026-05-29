import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['cliente_pos_venda'] === false) return Response.json({ ok: true, skipped: true });

    const clientName = data?.client_name || data?.full_name || 'Cliente';
    const clientPhone = data?.phone || '—';

    const msg = `🎉 *CLIENTE EM PÓS-VENDA*\n\nO cliente *${clientName}* acaba de entrar no status *Pós-Venda*.\n\n📞 Telefone: ${clientPhone}\n\nInicie o acompanhamento pós-venda: pesquisa de satisfação, agendamento de retorno e fidelização.`;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      metadata: { name: `Alerta: Pós-Venda — ${clientName}` }
    });
    await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});