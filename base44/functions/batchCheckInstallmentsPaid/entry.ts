import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Busca todas as vendas pendentes
        const pendingSales = await base44.asServiceRole.entities.Sale.filter({ status: 'pendente' });

        // Filtra apenas as que têm pagamentos parcelados
        const installmentSales = pendingSales.filter(sale =>
            (sale.payment_details || []).some(
                p => p.method === 'cartao_credito' || p.method === 'pix_parcelado'
            )
        );

        const results = { updated: [], skipped: [] };

        for (const sale of installmentSales) {
            const allInstallments = await base44.asServiceRole.entities.Installment.filter({ sale_id: sale.id });

            if (!allInstallments || allInstallments.length === 0) {
                results.skipped.push({ sale_number: sale.sale_number, reason: 'sem parcelas' });
                continue;
            }

            const allPaid = allInstallments.every(i => i.payment_status === 'pago');

            if (allPaid) {
                await base44.asServiceRole.entities.Sale.update(sale.id, { status: 'pago' });
                results.updated.push(sale.sale_number);
            } else {
                const paid = allInstallments.filter(i => i.payment_status === 'pago').length;
                results.skipped.push({ sale_number: sale.sale_number, reason: `${paid}/${allInstallments.length} pagas` });
            }
        }

        return Response.json({
            message: `Processadas ${installmentSales.length} vendas com parcelas.`,
            updated_count: results.updated.length,
            updated: results.updated,
            skipped: results.skipped
        });

    } catch (error) {
        console.error('Erro no batch check:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});