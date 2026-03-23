import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { sale_ids } = await req.json();

    if (!Array.isArray(sale_ids) || sale_ids.length === 0) {
      return Response.json({ error: 'sale_ids é obrigatório (array de IDs)' }, { status: 400 });
    }

    // Buscar PaymentTypes para obter taxas corretas
    const paymentTypes = await base44.asServiceRole.entities.PaymentType.filter({ status: 'ativo' });

    // Função para buscar taxa de débito
    const getDebitRate = (brand) => {
      if (!brand) return 0;
      for (const pt of paymentTypes.filter(p => p.type === 'cartao_debito')) {
        const found = (pt.card_brands || []).find(b => b.brand === brand);
        if (found) return Number(found.rate) || 0;
      }
      return 0;
    };

    // Função para buscar taxa de crédito por parcelas
    const getCreditRate = (brand, installments) => {
      if (!brand) return 0;
      for (const pt of paymentTypes.filter(p => p.type === 'cartao_credito')) {
        const brandData = (pt.card_brands || []).find(b => b.brand === brand);
        if (brandData) {
          const ir = (brandData.installment_rates || []).find(r => Number(r.installments) === Number(installments));
          return ir ? Number(ir.rate) : 0;
        }
      }
      return 0;
    };

    const results = [];

    for (const saleId of sale_ids) {
      try {
        const sale = await base44.asServiceRole.entities.Sale.list().then(sales => sales.find(s => s.id === saleId));
        if (!sale) {
          results.push({ sale_id: saleId, status: 'error', message: 'Venda não encontrada' });
          continue;
        }

        const enrichedPayments = (sale.payment_details || []).map(p => {
          let feeRate = 0;
          if (p.method === 'cartao_debito' && p.card_brand) {
            feeRate = getDebitRate(p.card_brand);
          } else if (p.method === 'cartao_credito' && p.card_brand) {
            feeRate = getCreditRate(p.card_brand, p.installments || 1);
          }
          const amount = Number(p.amount) || 0;
          const feeAmount = Number(((amount * feeRate) / 100).toFixed(2));
          const netAmount = Number((amount - feeAmount).toFixed(2));
          return { ...p, fee_rate: feeRate, fee_amount: feeAmount, net_amount: netAmount };
        });

        const totalFeeAmount = Number(enrichedPayments.reduce((s, p) => s + p.fee_amount, 0).toFixed(2));
        const totalNetAmount = Number((sale.total - totalFeeAmount).toFixed(2));

        await base44.asServiceRole.entities.Sale.update(saleId, {
          payment_details: enrichedPayments,
          total_fee_amount: totalFeeAmount,
          total_net_amount: totalNetAmount
        });

        // Agora sincronizar parcelas em Contas a Receber
        const installments = await base44.asServiceRole.entities.Installment.list().then(all => 
          all.filter(inst => inst.sale_id === saleId)
        );

        for (const inst of installments) {
          // Encontrar o payment_detail correspondente
          const payment = enrichedPayments.find(p => 
            (p.method === 'pix_parcelado' || p.method === 'cartao_credito') &&
            p.installments > 1
          );

          if (payment && payment.installments > 1) {
            const grossAmount = Number((payment.amount / payment.installments).toFixed(2));
            const feeAmount = Number(((grossAmount * payment.fee_rate) / 100).toFixed(2));
            const netAmount = Number((grossAmount - feeAmount).toFixed(2));

            await base44.asServiceRole.entities.Installment.update(inst.id, {
              fee_rate: payment.fee_rate,
              fee_amount: feeAmount,
              gross_amount: grossAmount,
              net_amount: netAmount
            });
          }
        }

        results.push({ 
          sale_id: saleId, 
          status: 'success', 
          sale_number: sale.sale_number,
          total_fee_amount: totalFeeAmount,
          total_net_amount: totalNetAmount
        });
      } catch (error) {
        results.push({ sale_id: saleId, status: 'error', message: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      results,
      processed: results.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});