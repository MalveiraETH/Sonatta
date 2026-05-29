import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['conserto_concluido'] === false) return Response.json({ ok: true, skipped: true });

    const clientName = data?.client_name || 'Cliente';
    const clientPhone = data?.client_phone || '—';
    const deviceName = data?.device_name || '—';
    const serialNumber = data?.serial_number || '—';
    const osNumber = data?.service_order_number || event?.entity_id;
    const statusLabel = data?.status === 'aguardando_retirada' ? 'Aguardando Retirada' : 'Reparado';

    const msg = `✅ *CONSERTO CONCLUÍDO — AGENDAR ENTREGA*\n\nA OS *${osNumber}* do cliente *${clientName}* foi concluída e está como *${statusLabel}*.\n\n📱 Aparelho: ${deviceName}\n🔢 Série: ${serialNumber}\n📞 Telefone: ${clientPhone}\n\nEntre em contato com o cliente para agendar a devolução do aparelho.`;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      metadata: { name: `Alerta: Conserto Concluído — ${clientName}` }
    });
    await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});