import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const corrections = {
      lead: [],
      teste_agendado: [],
      em_teste: [],
      teste_finalizado: [],
      teste_estendido: [],
      teste_pendente: [],
      cliente_ativo: [],
      pos_venda: []
    };

    // Buscar todos os clientes
    const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 1000);
    
    for (const client of allClients) {
      let newStatus = null;

      // 1. Verificar se tem venda (cliente_ativo ou pos_venda)
      const sales = await base44.asServiceRole.entities.Sale.filter({ 
        client_id: client.id,
        status: 'pago'
      });

      if (sales.length > 0) {
        // Verificar se há aparelho auditivo na última venda
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

        if (lastDeviceSale) {
          // Verificar garantia
          let maxWarrantyYears = 2;
          
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

          const warrantyEndDate = new Date(lastDeviceSaleDate);
          warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + maxWarrantyYears);

          if (new Date() > warrantyEndDate) {
            newStatus = 'pos_venda';
          } else {
            newStatus = 'cliente_ativo';
          }
        } else {
          // Venda sem aparelho = cliente ativo
          newStatus = 'cliente_ativo';
        }
      } else {
        // 2. Sem venda: verificar testes
        const tests = await base44.asServiceRole.entities.Test.filter({ 
          client_id: client.id 
        });

        if (tests.length > 0) {
          // Pegar o teste mais recente
          const sortedTests = tests.sort((a, b) => 
            new Date(b.created_date) - new Date(a.created_date)
          );
          const latestTest = sortedTests[0];

          const statusMap = {
            'teste_agendado': 'teste_agendado',
            'em_teste': 'em_teste',
            'teste_estendido': 'teste_estendido',
            'teste_finalizado': 'teste_finalizado',
            'teste_pendente': 'teste_pendente'
          };

          newStatus = statusMap[latestTest.status] || 'lead';
        } else {
          // 3. Sem teste e sem venda = lead
          newStatus = 'lead';
        }
      }

      // Aplicar correção se necessário
      if (newStatus && newStatus !== client.status) {
        await base44.asServiceRole.entities.Client.update(client.id, { 
          status: newStatus 
        });
        corrections[newStatus].push(client.full_name);
      }
    }

    const totalCorrected = Object.values(corrections).reduce((sum, arr) => sum + arr.length, 0);

    return Response.json({
      success: true,
      message: `Correção concluída. ${totalCorrected} cliente(s) corrigido(s).`,
      corrections
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});