import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { saleId, paymentDate, extraFee = 0 } = await req.json();

        if (!saleId || !paymentDate) {
            return Response.json({ error: 'saleId e paymentDate são obrigatórios' }, { status: 400 });
        }

        // Busca todas as parcelas pendentes desta venda
        const allInstallments = await base44.asServiceRole.entities.Installment.filter({ sale_id: saleId });
        const pending = allInstallments.filter(i => i.payment_status !== 'pago');

        if (pending.length === 0) {
            return Response.json({ message: 'Nenhuma parcela pendente encontrada para esta venda.', count: 0 });
        }

        const extraFeePerInstallment = pending.length > 0 ? Number(extraFee) / pending.length : 0;

        // Atualiza cada parcela pendente individualmente
        for (const installment of pending) {
            const grossAmount = installment.gross_amount || installment.original_amount || 0;
            const baseFeeAmount = installment.fee_amount || 0;
            const newFeeAmount = baseFeeAmount + extraFeePerInstallment;
            const newNetAmount = grossAmount - newFeeAmount;

            const paymentHistory = [...(installment.payment_history || []), {
                date: paymentDate,
                amount: installment.remaining_amount || grossAmount,
                note: Number(extraFee) > 0 ? `Liquidação antecipada com taxa extra` : 'Liquidação antecipada'
            }];

            await base44.asServiceRole.entities.Installment.update(installment.id, {
                paid_amount: grossAmount,
                remaining_amount: 0,
                payment_status: 'pago',
                last_payment_date: paymentDate,
                fee_amount: newFeeAmount,
                net_amount: newNetAmount,
                payment_history: paymentHistory
            });
        }

        return Response.json({ 
            message: 'Parcelas liquidadas com sucesso', 
            count: pending.length 
        });

    } catch (error) {
        console.error('Erro ao liquidar parcelas:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});