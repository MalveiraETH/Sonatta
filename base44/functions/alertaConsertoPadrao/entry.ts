import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['conserto_parado'] === false) return Response.json({ ok: true, skipped: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const marcos = [7, 15, 30];
    const statusAtivos = ['aberto', 'enviado_ao_fornecedor', 'em_reparo', 'reparado'];

    const repairs = await base44.asServiceRole.entities.DeviceRepair.filter({});
    const alertas = [];

    for (const repair of repairs.filter(r => statusAtivos.includes(r.status))) {
      const diffDays = Math.floor((today - new Date(repair.updated_date)) / (1000 * 60 * 60 * 24));
      if (marcos.includes(diffDays)) alertas.push({ repair, dias: diffDays });
    }

    const statusLabels = { aberto: 'Aberto', enviado_ao_fornecedor: 'Enviado ao Fornecedor', em_reparo: 'Em Reparo', reparado: 'Reparado' };

    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

    for (const { repair, dias } of alertas) {
      const msg = `🔧 *CONSERTO PARADO — ${dias} DIAS SEM ATUALIZAÇÃO*\n\nA OS *${repair.service_order_number || repair.id}* do cliente *${repair.client_name}* está parada há *${dias} dias*.\n\n📱 Aparelho: ${repair.device_name}\n🔢 Série: ${repair.serial_number}\n🏭 Fornecedor: ${repair.supplier_name || '—'}\n📊 Status atual: ${statusLabels[repair.status] || repair.status}\n📅 Última atualização: ${new Date(repair.updated_date).toLocaleDateString('pt-BR')}\n\nVerifique o andamento do reparo e atualize o status.`;
      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        app_user_id: adminUserId,
        metadata: { name: `Alerta: Conserto Parado ${dias}d — ${repair.client_name}` }
      });
      await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});