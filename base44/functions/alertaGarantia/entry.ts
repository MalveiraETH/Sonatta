import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['garantia_vencendo'] === false) return Response.json({ ok: true, skipped: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MARCOS_DIAS = [30, 7];

    const sales = await base44.asServiceRole.entities.Sale.filter({ status: 'pago' });
    const alertas = [];

    for (const sale of sales) {
      const saleDate = new Date(sale.sale_date);
      const aparelhos = (sale.items || []).filter(i => i.serial_number);

      for (const item of aparelhos) {
        let warrantyYears = 2;
        if (item.product_id) {
          const products = await base44.asServiceRole.entities.Product.filter({ id: item.product_id });
          if (products[0]?.warranty_years) warrantyYears = products[0].warranty_years;
        }

        const warrantyEnd = new Date(saleDate);
        warrantyEnd.setFullYear(warrantyEnd.getFullYear() + warrantyYears);

        const diffDays = Math.floor((warrantyEnd - today) / (1000 * 60 * 60 * 24));
        if (MARCOS_DIAS.includes(diffDays)) alertas.push({ sale, item, warrantyEnd, diffDays, warrantyYears });
      }
    }

    for (const { sale, item, warrantyEnd, diffDays, warrantyYears } of alertas) {
      const msg = `🛡️ *GARANTIA VENCENDO EM ${diffDays} DIAS*\n\nA garantia do aparelho do cliente *${sale.client_name}* vence em *${diffDays} dias*.\n\n📱 Aparelho: ${item.product_name || '—'}\n🔢 Série: ${item.serial_number}\n📅 Data da venda: ${new Date(sale.sale_date).toLocaleDateString('pt-BR')}\n⏳ Garantia: ${warrantyYears} anos\n🗓️ Vencimento: ${warrantyEnd.toLocaleDateString('pt-BR')}\n📞 Telefone: ${sale.client_phone || '—'}\n\nEntre em contato com o cliente para informar sobre o vencimento da garantia.`;
      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Garantia ${diffDays}d — ${sale.client_name}` }
      });
      await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});