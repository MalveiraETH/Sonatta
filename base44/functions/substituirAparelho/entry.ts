import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Substitui um aparelho serializado vendido com defeito por outro aparelho serializado disponível.
 *
 * - NÃO altera a venda original e NÃO cria uma nova venda.
 * - O substituto passa a constar como 'vendido' e vinculado ao mesmo cliente.
 * - O defeituoso sai do estoque disponível ('indisponivel') e fica aguardando conserto.
 * - Registra StockMovement dos dois seriais e a ação no AuditLog.
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

    const { defective_product_id, replacement_product_id, problem, notes } = await req.json();

    if (!defective_product_id || !replacement_product_id) {
      return Response.json({ error: 'Informe o aparelho com defeito e o aparelho substituto' }, { status: 400 });
    }
    if (defective_product_id === replacement_product_id) {
      return Response.json({ error: 'O aparelho substituto deve ser diferente do aparelho com defeito' }, { status: 400 });
    }

    const defectiveList = await base44.asServiceRole.entities.Product.filter({ id: defective_product_id });
    const defective = defectiveList[0];
    if (!defective) {
      return Response.json({ error: 'Aparelho com defeito não encontrado' }, { status: 404 });
    }

    const replacementList = await base44.asServiceRole.entities.Product.filter({ id: replacement_product_id });
    const replacement = replacementList[0];
    if (!replacement) {
      return Response.json({ error: 'Aparelho substituto não encontrado' }, { status: 404 });
    }

    if (defective.stock_type !== 'serializado' || replacement.stock_type !== 'serializado') {
      return Response.json({ error: 'A substituição é permitida apenas entre aparelhos serializados' }, { status: 400 });
    }
    if (defective.status !== 'vendido' || !defective.client_id) {
      return Response.json({ error: 'O aparelho com defeito precisa estar vendido e vinculado a um cliente' }, { status: 400 });
    }
    if (defective.substitution_stage === 'aguardando_conserto') {
      return Response.json({ error: 'Este aparelho já está em substituição, aguardando retorno do conserto' }, { status: 400 });
    }
    if (replacement.status !== 'disponivel') {
      return Response.json({ error: 'O aparelho substituto precisa estar disponível no estoque' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const clientName = defective.client_name || '';

    // O substituto assume o cliente — a venda original permanece intacta
    await base44.asServiceRole.entities.Product.update(replacement.id, {
      status: 'vendido',
      client_id: defective.client_id,
      client_name: clientName,
      association_date: today,
      substitution_date: today,
      substitution_client_id: defective.client_id,
      substitution_client_name: clientName,
      replaced_product_id: defective.id,
      replaced_serial: defective.serial_number || ''
    });

    // O defeituoso sai do estoque disponível e aguarda conserto
    await base44.asServiceRole.entities.Product.update(defective.id, {
      status: 'indisponivel',
      substitution_date: today,
      substitution_problem: problem || '',
      substitution_notes: notes || '',
      substitution_stage: 'aguardando_conserto',
      substitution_client_id: defective.client_id,
      substitution_client_name: clientName,
      substituted_by_id: replacement.id,
      substituted_by_serial: replacement.serial_number || ''
    });

    await base44.asServiceRole.entities.StockMovement.bulkCreate([
      {
        product_id: replacement.id,
        product_name: replacement.name,
        type: 'saida',
        quantity: 1,
        reason: `Substituição por defeito — vinculado a ${clientName || 'cliente'} (substitui o NS ${defective.serial_number || '-'})`,
        sale_date: today
      },
      {
        product_id: defective.id,
        product_name: defective.name,
        type: 'ajuste',
        quantity: 1,
        reason: `Substituição por defeito — enviado para conserto (substituído pelo NS ${replacement.serial_number || '-'})`,
        sale_date: today
      }
    ]);

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Product',
      entity_id: defective.id,
      action: 'edicao',
      description: `Substituição de aparelho: NS ${defective.serial_number || '-'} → NS ${replacement.serial_number || '-'} para o cliente "${clientName}"`,
      details: {
        defective_product_id: defective.id,
        defective_serial: defective.serial_number || '',
        replacement_product_id: replacement.id,
        replacement_serial: replacement.serial_number || '',
        client_id: defective.client_id,
        client_name: clientName,
        substitution_date: today,
        problem: problem || '',
        performed_by: user.full_name || user.email
      }
    });

    return Response.json({
      success: true,
      defective_product_id: defective.id,
      replacement_product_id: replacement.id,
      replacement_serial: replacement.serial_number || '',
      client_id: defective.client_id,
      client_name: clientName,
      substitution_date: today
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}