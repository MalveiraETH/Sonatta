import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função para processar atualização de estoque após uma venda
// Executada com service role pois Product.update exige admin no RLS
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, sale_id, sale_number, sale_date, mode } = await req.json();

    // mode: 'sale' = baixa estoque, 'cancel' = devolve estoque
    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'items é obrigatório' }, { status: 400 });
    }

    const results = [];

    for (const item of items) {
      if (!item.product_id) continue;

      const products = await base44.asServiceRole.entities.Product.filter({ id: item.product_id });
      const product = products[0];
      if (!product) continue;

      if (mode === 'sale') {
        // Baixar estoque
        if (product.stock_type === 'serializado') {
          await base44.asServiceRole.entities.Product.update(product.id, { status: 'vendido' });
        } else {
          const newQty = Math.max(0, (product.quantity || 0) - (item.quantity || 1));
          await base44.asServiceRole.entities.Product.update(product.id, { quantity: newQty });
        }

        await base44.asServiceRole.entities.StockMovement.create({
          product_id: product.id,
          product_name: product.name,
          type: 'saida',
          quantity: item.quantity || 1,
          reason: `Venda ${sale_number}`,
          reference_id: sale_id,
          sale_date: sale_date
        });
      } else if (mode === 'cancel') {
        // Devolver ao estoque
        if (product.stock_type === 'serializado') {
          await base44.asServiceRole.entities.Product.update(product.id, { status: 'disponivel' });
        } else {
          await base44.asServiceRole.entities.Product.update(product.id, {
            quantity: (product.quantity || 0) + (item.quantity || 1)
          });
        }

        await base44.asServiceRole.entities.StockMovement.create({
          product_id: product.id,
          product_name: product.name,
          type: 'entrada',
          quantity: item.quantity || 1,
          reason: `Venda ${sale_number} cancelada`,
          reference_id: sale_id
        });
      }

      results.push({ product_id: product.id, product_name: product.name, done: true });
    }

    return Response.json({ success: true, processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});