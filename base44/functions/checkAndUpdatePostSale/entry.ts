import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os clientes ativos
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'cliente_ativo' });
    const updatedClients = [];

    for (const client of clients) {
      // Buscar todas as vendas deste cliente
      const sales = await base44.asServiceRole.entities.Sale.filter({ 
        client_id: client.id,
        status: 'pago'
      });

      if (sales.length === 0) continue;

      // Encontrar a última venda de aparelho auditivo
      let lastDeviceSale = null;
      let lastDeviceSaleDate = null;

      for (const sale of sales) {
        if (!sale.items || sale.items.length === 0) continue;
        
        const hasDevice = sale.items.some(item => 
          item.product_name?.toLowerCase().includes('aparelho') ||
          item.product_name?.toLowerCase().includes('auditivo')
        );

        if (hasDevice) {
          const saleDate = new Date(sale.sale_date || sale.created_date);
          if (!lastDeviceSale || saleDate > lastDeviceSaleDate) {
            lastDeviceSale = sale;
            lastDeviceSaleDate = saleDate;
          }
        }
      }

      if (!lastDeviceSale) continue;

      // Verificar a garantia do produto
      let maxWarrantyYears = 2; // Garantia padrão
      
      for (const item of lastDeviceSale.items) {
        const products = await base44.asServiceRole.entities.Product.filter({ 
          id: item.product_id 
        });
        
        if (products.length > 0) {
          const product = products[0];
          if (product.warranty_years && product.warranty_years > maxWarrantyYears) {
            maxWarrantyYears = product.warranty_years;
          }
        }
      }

      // Calcular data de vencimento da garantia
      const warrantyEndDate = new Date(lastDeviceSaleDate);
      warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + maxWarrantyYears);

      // Verificar se está fora da garantia
      const now = new Date();
      if (now > warrantyEndDate) {
        // Atualizar para pós-venda
        await base44.asServiceRole.entities.Client.update(client.id, { 
          status: 'pos_venda' 
        });
        updatedClients.push(client.full_name);
      }
    }

    return Response.json({
      success: true,
      message: `Verificação concluída. ${updatedClients.length} cliente(s) atualizado(s) para pós-venda.`,
      updated: updatedClients
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});