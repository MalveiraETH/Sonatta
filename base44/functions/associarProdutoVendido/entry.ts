import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Associa um produto serializado (status 'vendido', sem Sale cadastrada) a um cliente.
 * Pode receber um client_id existente OU new_client_data para criar um novo cliente.
 * Atualiza o Product com client_id, client_name e association_date.
 * Registra a ação no AuditLog.
 *
 * Executado com service role pois Product.update e Client.create exigem admin no RLS.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, client_id, new_client_data } = await req.json();

    if (!product_id) {
      return Response.json({ error: 'product_id é obrigatório' }, { status: 400 });
    }

    // Busca o produto
    const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    const product = products[0];
    if (!product) {
      return Response.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Validações: serializado, vendido e sem Sale associada
    if (product.stock_type !== 'serializado') {
      return Response.json({ error: 'Apenas produtos serializados podem ser associados' }, { status: 400 });
    }
    if (product.status !== 'vendido') {
      return Response.json({ error: 'O produto precisa estar com status "vendido"' }, { status: 400 });
    }
    if (product.client_id) {
      return Response.json({ error: 'Este produto já está associado a um cliente' }, { status: 400 });
    }

    // Verifica se existe alguma Sale com este produto nos items
    const salesWithProduct = await base44.asServiceRole.entities.Sale.filter({
      items: { $elemMatch: { product_id: product_id } }
    });
    if (salesWithProduct && salesWithProduct.length > 0) {
      return Response.json({ error: 'Este produto já possui uma venda cadastrada' }, { status: 400 });
    }

    let finalClientId = client_id;
    let finalClientName = '';

    // Se veio new_client_data, cria o cliente primeiro
    if (!finalClientId && new_client_data) {
      if (!new_client_data.full_name || !new_client_data.phone) {
        return Response.json({ error: 'Nome completo e telefone são obrigatórios para o novo cliente' }, { status: 400 });
      }

      // Verifica duplicidade de CPF (se informado)
      if (new_client_data.cpf) {
        const existing = await base44.asServiceRole.entities.Client.filter({ cpf: new_client_data.cpf });
        if (existing && existing.length > 0) {
          return Response.json({ error: 'Já existe um cliente com este CPF' }, { status: 400 });
        }
      }

      const newClient = await base44.asServiceRole.entities.Client.create({
        full_name: new_client_data.full_name,
        phone: new_client_data.phone,
        cpf: new_client_data.cpf || '',
        email: new_client_data.email || '',
        status: 'cliente_ativo'
      });
      finalClientId = newClient.id;
      finalClientName = newClient.full_name;
    } else if (finalClientId) {
      // Busca o nome do cliente existente
      const clients = await base44.asServiceRole.entities.Client.filter({ id: finalClientId });
      const client = clients[0];
      if (!client) {
        return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
      }
      finalClientName = client.full_name;
    } else {
      return Response.json({ error: 'Informe client_id ou new_client_data' }, { status: 400 });
    }

    // Atualiza o produto com o vínculo
    const today = new Date().toISOString().slice(0, 10);
    await base44.asServiceRole.entities.Product.update(product_id, {
      client_id: finalClientId,
      client_name: finalClientName,
      association_date: today
    });

    // Registra no AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Product',
      entity_id: product_id,
      action: 'edicao',
      description: `Produto "${product.name}" (NS: ${product.serial_number || '-'}) associado ao cliente "${finalClientName}"`,
      details: {
        product_id: product_id,
        client_id: finalClientId,
        client_name: finalClientName,
        association_date: today,
        performed_by: user.full_name || user.email
      }
    });

    return Response.json({
      success: true,
      product_id: product_id,
      client_id: finalClientId,
      client_name: finalClientName,
      association_date: today
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});