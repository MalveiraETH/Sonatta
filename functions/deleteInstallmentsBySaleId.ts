import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sale_id } = body;

        if (!sale_id) {
            return Response.json({ error: 'sale_id is required' }, { status: 400 });
        }

        // Buscar todas as parcelas com esse sale_id
        const installments = await base44.asServiceRole.entities.Installment.filter({ sale_id });

        let deleted = 0;
        for (const inst of installments) {
            try {
                await base44.asServiceRole.entities.Installment.delete(inst.id);
                deleted++;
            } catch (e) {
                console.error(`Erro ao excluir parcela ${inst.id}:`, e.message);
            }
        }

        return Response.json({ success: true, deleted, total: installments.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});