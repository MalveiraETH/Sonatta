import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        // Chamado via automation de entity no Installment
        const { event, data } = payload;

        // Só processa updates de parcelas
        if (!data || !data.sale_id) {
            return Response.json({ message: 'Sem sale_id, ignorando.' });
        }

        const saleId = data.sale_id;

        // Busca a venda para verificar se já está paga ou cancelada
        const sale = await base44.asServiceRole.entities.Sale.get(saleId);
        if (!sale || sale.status === 'pago' || sale.status === 'cancelado') {
            return Response.json({ message: 'Venda já paga/cancelada ou não encontrada, ignorando.' });
        }

        // Verifica se a venda tem pagamentos parcelados (crédito ou pix_parcelado)
        const hasInstallmentPayment = (sale.payment_details || []).some(
            p => p.method === 'cartao_credito' || p.method === 'pix_parcelado'
        );

        if (!hasInstallmentPayment) {
            return Response.json({ message: 'Venda sem pagamentos parcelados, ignorando.' });
        }

        // Busca todas as parcelas desta venda
        const allInstallments = await base44.asServiceRole.entities.Installment.filter({ sale_id: saleId });

        if (!allInstallments || allInstallments.length === 0) {
            return Response.json({ message: 'Sem parcelas encontradas.' });
        }

        // Verifica se TODAS estão pagas
        const allPaid = allInstallments.every(i => i.payment_status === 'pago');

        if (allPaid) {
            await base44.asServiceRole.entities.Sale.update(saleId, { status: 'pago' });
            return Response.json({ message: `Venda ${sale.sale_number} marcada como paga automaticamente.` });
        }

        return Response.json({ 
            message: 'Parcelas ainda pendentes.',
            total: allInstallments.length,
            paid: allInstallments.filter(i => i.payment_status === 'pago').length
        });

    } catch (error) {
        console.error('Erro ao verificar parcelas:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});