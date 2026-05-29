import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Roda diariamente. Verifica consertos parados sem atualização há 7, 15 ou 30 dias.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const marcos = [7, 15, 30];
    const statusAtivos = ['aberto', 'enviado_ao_fornecedor', 'em_reparo', 'reparado'];

    const repairs = await base44.asServiceRole.entities.DeviceRepair.filter({});
    const ativos = repairs.filter(r => statusAtivos.includes(r.status));

    const alertas = [];

    for (const repair of ativos) {
      const lastUpdate = new Date(repair.updated_date);
      const diffDays = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));

      if (marcos.includes(diffDays)) {
        alertas.push({ repair, dias: diffDays });
      }
    }

    for (const { repair, dias } of alertas) {
      const statusLabels = {
        aberto: 'Aberto',
        enviado_ao_fornecedor: 'Enviado ao Fornecedor',
        em_reparo: 'Em Reparo',
        reparado: 'Reparado'
      };

      const msg = `🔧 *CONSERTO PARADO — ${dias} DIAS SEM ATUALIZAÇÃO*\n\nA OS *${repair.service_order_number || repair.id}* do cliente *${repair.client_name}* está parada há *${dias} dias*.\n\n📱 Aparelho: ${repair.device_name}\n🔢 Série: ${repair.serial_number}\n🏭 Fornecedor: ${repair.supplier_name || '—'}\n📊 Status atual: ${statusLabels[repair.status] || repair.status}\n📅 Última atualização: ${new Date(repair.updated_date).toLocaleDateString('pt-BR')}\n\nVerifique o andamento do reparo e atualize o status.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Conserto Parado ${dias}d — ${repair.client_name}` }
      });

      await base44.asServiceRole.agents.addMessage(conv, {
        role: 'user',
        content: msg
      });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});