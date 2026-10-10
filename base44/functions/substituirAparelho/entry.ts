import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Substitui um aparelho serializado por outro disponível em estoque.
 *
 * - NÃO altera a venda original e NÃO cria uma nova venda.
 * - O aparelho substituto passa a constar como 'vendido' e vinculado ao cliente.
 * - O aparelho com defeito sai do estoque disponível ('indisponivel') e fica aguardando conserto.
 * - O cliente vem do próprio aparelho ou pode ser informado (aparelho ainda sem cliente vinculado).
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

    const { defective_product_id, replacement_product_id, problem, notes, client_id, client_name } =
      await req.json();

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
    if (defective.status === 'descartado') {
      return Response.json({ error: 'Aparelho descartado não pode ser substituído' }, { status: 400 });
    }
    if (defective.substitution_stage === 'aguardando_conserto') {
      return Response.json({ error: 'Este aparelho já está em substituição, aguardando retorno do conserto' }, { status: 400 });
    }
    if (replacement.status !== 'disponivel') {
      return Response.json({ error: 'O aparelho substituto precisa estar disponível no estoque' }, { status: 400 });
    }

    // O cliente do aparelho substituído (vinculado ou informado na substituição)
    const effectiveClientId = defective.client_id || client_id || '';
    const effectiveClientName = defective.client_name || client_name || '';
    if (!effectiveClientId) {
      return Response.json({ error: 'Informe o cliente que está com o aparelho com defeito' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // O substituto assume o cliente — a venda original permanece intacta
    await base44.asServiceRole.entities.Product.update(replacement.id, {
      status: 'vendido',
      client_id: effectiveClientId,
      client_name: effectiveClientName,
      association_date: today,
      substitution_date: today,
      substitution_client_id: effectiveClientId,
      substitution_client_name: effectiveClientName,
      replaced_product_id: defective.id,
      replaced_serial: defective.serial_number || ''
    });

    // O defeituoso sai do estoque disponível e aguarda conserto
    const defectiveUpdate = {
      status: 'indisponivel',
      substitution_date: today,
      substitution_problem: problem || '',
      substitution_notes: notes || '',
      substitution_stage: 'aguardando_conserto',
      substitution_client_id: effectiveClientId,
      substitution_client_name: effectiveClientName,
      substituted_by_id: replacement.id,
      substituted_by_serial: replacement.serial_number || ''
    };
    // Aparelho ainda sem cliente vinculado passa a ficar associado (sem venda)
    if (!defective.client_id) {
      defectiveUpdate.client_id = effectiveClientId;
      defectiveUpdate.client_name = effectiveClientName;
      defectiveUpdate.association_date = today;
    }
    await base44.asServiceRole.entities.Product.update(defective.id, defectiveUpdate);

    await base44.asServiceRole.entities.StockMovement.bulkCreate([
      {
        product_id: replacement.id,
        product_name: replacement.name,
        type: 'saida',
        quantity: 1,
        reason: `Substituição por defeito — vinculado a ${effectiveClientName || 'cliente'} (substitui o NS ${defective.serial_number || '-'})`,
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
      description: `Substituição de aparelho: NS ${defective.serial_number || '-'} → NS ${replacement.serial_number || '-'} para o cliente "${effectiveClientName}"`,
      details: {
        defective_product_id: defective.id,
        defective_serial: defective.serial_number || '',
        defective_status_anterior: defective.status || '',
        replacement_product_id: replacement.id,
        replacement_serial: replacement.serial_number || '',
        client_id: effectiveClientId,
        client_name: effectiveClientName,
        client_from_product: !!defective.client_id,
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
      client_id: effectiveClientId,
      client_name: effectiveClientName,
      substitution_date: today
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}