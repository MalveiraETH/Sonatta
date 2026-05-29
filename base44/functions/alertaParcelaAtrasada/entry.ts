import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Roda diariamente. Verifica parcelas de pix_parcelado ou cartao_credito com status atrasado.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca parcelas em atraso
    const installments = await base44.asServiceRole.entities.Installment.filter({ payment_status: 'atrasado' });

    // Filtra apenas pix_parcelado e cartao_credito
    const atrasadas = installments.filter(i =>
      i.payment_method === 'pix_parcelado' || i.payment_method === 'cartao_credito'
    );

    // Agrupa por cliente para não enviar múltiplos alertas do mesmo cliente
    const porCliente = {};
    for (const inst of atrasadas) {
      if (!porCliente[inst.client_id]) {
        porCliente[inst.client_id] = { client_name: inst.client_name, sale_number: inst.sale_number, parcelas: [] };
      }
      porCliente[inst.client_id].parcelas.push(inst);
    }

    for (const [clientId, info] of Object.entries(porCliente)) {
      const totalAtrasado = info.parcelas.reduce((acc, p) => acc + (p.gross_amount || p.original_amount || 0), 0);
      const metodoPagamento = info.parcelas[0]?.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão de Crédito';
      const valorFmt = `R$ ${totalAtrasado.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

      const parcelasDesc = info.parcelas.map(p =>
        `• Parcela ${p.installment_number}/${p.installments_total} — venc. ${new Date(p.due_date).toLocaleDateString('pt-BR')}`
      ).join('\n');

      const msg = `⚠️ *PARCELA(S) EM ATRASO*\n\nO cliente *${info.client_name}* possui parcelas em atraso.\n\n💳 Método: ${metodoPagamento}\n🧾 Venda: ${info.sale_number || '—'}\n💰 Total em atraso: ${valorFmt}\n\n${parcelasDesc}\n\nEntre em contato com o cliente para regularizar o pagamento.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Parcela Atrasada — ${info.client_name}` }
      });

      await base44.asServiceRole.agents.addMessage(conv, {
        role: 'user',
        content: msg
      });
    }

    return Response.json({ ok: true, clientes_alertados: Object.keys(porCliente).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});