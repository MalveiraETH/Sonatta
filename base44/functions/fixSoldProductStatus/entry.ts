import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        // Buscar todas as vendas (não canceladas)
        const sales = await base44.asServiceRole.entities.Sale.list('-created_date', 2000);
        const soldSerials = new Set();
        for (const s of sales) {
            if (s.status === 'cancelado') continue;
            for (const it of (s.items || [])) {
                if (it.serial_number) soldSerials.add(it.serial_number.trim());
            }
        }

        // Buscar todos os produtos serializados
        const products = await base44.asServiceRole.entities.Product.filter({ stock_type: 'serializado' });

        // Filtrar os que estão vendidos mas com status errado
        const toFix = products.filter(p =>
            p.serial_number && soldSerials.has(p.serial_number.trim()) && p.status !== 'vendido'
        );

        // Atualizar em lotes de 20 com pequeno intervalo
        const batchSize = 20;
        let updated = 0;
        for (let i = 0; i < toFix.length; i += batchSize) {
            const batch = toFix.slice(i, i + batchSize);
            for (const p of batch) {
                await base44.asServiceRole.entities.Product.update(p.id, { status: 'vendido' });
                updated++;
            }
            if (i + batchSize < toFix.length) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        return Response.json({ fixed: updated, total: toFix.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});