import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar tudo de uma vez
    const [allClients, allSales] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-created_date', 1000),
      base44.asServiceRole.entities.Sale.filter({ status: 'pago' }, '-sale_date', 2000)
    ]);

    // Agrupar vendas por cliente
    const salesByClient = {};
    for (const sale of allSales) {
      if (!salesByClient[sale.client_id]) salesByClient[sale.client_id] = [];
      salesByClient[sale.client_id].push(sale);
    }

    const corrected = [];

    for (const client of allClients) {
      let newStatus = null;
      const clientSales = salesByClient[client.id] || [];

      if (clientSales.length > 0) {
        // Tem venda paga: verificar se ainda está em garantia (2 anos)
        let lastDeviceSaleDate = null;

        for (const sale of clientSales) {
          if (!sale.items || sale.items.length === 0) continue;
          const hasDevice = sale.items.some(item =>
            item.product_name?.toLowerCase().includes('aparelho') ||
            item.product_name?.toLowerCase().includes('auditivo')
          );
          if (hasDevice) {
            const saleDate = new Date(sale.sale_date || sale.created_date);
            if (!lastDeviceSaleDate || saleDate > lastDeviceSaleDate) {
              lastDeviceSaleDate = saleDate;
            }
          }
        }

        if (lastDeviceSaleDate) {
          const warrantyEnd = new Date(lastDeviceSaleDate);
          warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 2);
          newStatus = new Date() > warrantyEnd ? 'pos_venda' : 'cliente_ativo';
        } else {
          newStatus = 'cliente_ativo';
        }
      } else {
        // Sem venda paga = lead (testes não afetam mais o status)
        newStatus = 'lead';
      }

      if (newStatus && newStatus !== client.status) {
        await base44.asServiceRole.entities.Client.update(client.id, { status: newStatus });
        corrected.push({ name: client.full_name, from: client.status, to: newStatus });
      }
    }

    return Response.json({
      success: true,
      message: `Correção concluída. ${corrected.length} cliente(s) corrigido(s).`,
      corrected
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});