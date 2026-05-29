import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Roda diariamente. Verifica aparelhos com garantia vencendo em 30 ou 7 dias.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const MARCOS_DIAS = [30, 7]; // avisar 30 e 7 dias antes do vencimento

    const sales = await base44.asServiceRole.entities.Sale.filter({ status: 'pago' });

    const alertas = [];

    for (const sale of sales) {
      const saleDate = new Date(sale.sale_date);

      // Verifica itens com aparelhos auditivos (verificamos pela existência de serial_number)
      const aparelhos = (sale.items || []).filter(i => i.serial_number);

      for (const item of aparelhos) {
        // Busca produto para obter anos de garantia
        let warrantyYears = 2; // padrão
        if (item.product_id) {
          const products = await base44.asServiceRole.entities.Product.filter({ id: item.product_id });
          if (products.length > 0 && products[0].warranty_years) {
            warrantyYears = products[0].warranty_years;
          }
        }

        const warrantyEnd = new Date(saleDate);
        warrantyEnd.setFullYear(warrantyEnd.getFullYear() + warrantyYears);

        const diffDays = Math.floor((warrantyEnd - today) / (1000 * 60 * 60 * 24));

        if (MARCOS_DIAS.includes(diffDays)) {
          alertas.push({ sale, item, warrantyEnd, diffDays, warrantyYears });
        }
      }
    }

    for (const { sale, item, warrantyEnd, diffDays, warrantyYears } of alertas) {
      const warrantyEndFmt = warrantyEnd.toLocaleDateString('pt-BR');
      const vendaFmt = new Date(sale.sale_date).toLocaleDateString('pt-BR');

      const msg = `🛡️ *GARANTIA VENCENDO EM ${diffDays} DIAS*\n\nA garantia do aparelho do cliente *${sale.client_name}* vence em *${diffDays} dias*.\n\n📱 Aparelho: ${item.product_name || '—'}\n🔢 Série: ${item.serial_number}\n📅 Data da venda: ${vendaFmt}\n⏳ Garantia: ${warrantyYears} anos\n🗓️ Vencimento: ${warrantyEndFmt}\n📞 Telefone: ${sale.client_phone || '—'}\n\nEntre em contato com o cliente para informar sobre o vencimento da garantia e eventual renovação de contrato.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Garantia ${diffDays}d — ${sale.client_name}` }
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