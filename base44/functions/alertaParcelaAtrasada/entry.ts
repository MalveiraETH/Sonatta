import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['parcela_atrasada'] === false) return Response.json({ ok: true, skipped: true });

    const installments = await base44.asServiceRole.entities.Installment.filter({ payment_status: 'atrasado' });
    const atrasadas = installments.filter(i =>
      i.payment_method === 'pix_parcelado' || i.payment_method === 'cartao_credito'
    );

    const porCliente = {};
    for (const inst of atrasadas) {
      if (!porCliente[inst.client_id]) {
        porCliente[inst.client_id] = { client_name: inst.client_name, sale_number: inst.sale_number, parcelas: [] };
      }
      porCliente[inst.client_id].parcelas.push(inst);
    }

    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

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
        app_user_id: adminUserId,
        metadata: { name: `Alerta: Parcela Atrasada — ${info.client_name}` }
      });
      await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });
    }

    return Response.json({ ok: true, clientes_alertados: Object.keys(porCliente).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});