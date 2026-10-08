import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Conclui o conserto de um aparelho que saiu do estoque por substituição
 * (substitution_stage = 'aguardando_conserto') e devolve o aparelho ao estoque
 * como 'disponivel', registrando a entrada em StockMovement e a ação no AuditLog.
 *
 * Executado com service role pois Product.update exige admin no RLS.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { defective_product_id } = await req.json();

    if (!defective_product_id) {
      return Response.json({ error: 'Informe o aparelho' }, { status: 400 });
    }

    const list = await base44.asServiceRole.entities.Product.filter({ id: defective_product_id });
    const product = list[0];
    if (!product) {
      return Response.json({ error: 'Aparelho não encontrado' }, { status: 404 });
    }
    if (product.substitution_stage !== 'aguardando_conserto') {
      return Response.json({ error: 'Este aparelho não está aguardando retorno do conserto' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    await base44.asServiceRole.entities.Product.update(product.id, {
      status: 'disponivel',
      substitution_stage: 'conserto_concluido',
      returned_to_stock_date: today,
      client_id: '',
      client_name: '',
      association_date: ''
    });

    await base44.asServiceRole.entities.StockMovement.create({
      product_id: product.id,
      product_name: product.name,
      type: 'entrada',
      quantity: 1,
      reason: `Retorno ao estoque após conserto (substituição — cliente ${product.substitution_client_name || '-'})`,
      sale_date: today
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Product',
      entity_id: product.id,
      action: 'edicao',
      description: `Conserto concluído: aparelho NS ${product.serial_number || '-'} retornou ao estoque como disponível`,
      details: {
        product_id: product.id,
        serial_number: product.serial_number || '',
        substituted_by_serial: product.substituted_by_serial || '',
        returned_to_stock_date: today,
        performed_by: user.full_name || user.email
      }
    });

    return Response.json({
      success: true,
      product_id: product.id,
      returned_to_stock_date: today
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}