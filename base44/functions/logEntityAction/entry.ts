import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const entityLabels = {
  Client: 'Cliente',
  Appointment: 'Agendamento',
  Quote: 'Orçamento',
  Sale: 'Venda',
  Test: 'Teste',
  MoldOrder: 'Molde/Tampão',
  Product: 'Produto',
  DeviceRepair: 'Conserto',
  Professional: 'Profissional',
  Contract: 'Contrato'
};

const actionLabels = {
  create: 'criacao',
  update: 'edicao',
  delete: 'exclusao'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let userName = 'Sistema';
    try {
      const user = await base44.auth.me();
      if (user?.full_name) userName = user.full_name;
    } catch (_) {
      // Automação - sem usuário logado
    }

    const body = await req.json();
    const { event, data, changed_fields } = body;

    if (!event || !event.entity_name) {
      return Response.json({ error: 'Missing entity event data' }, { status: 400 });
    }

    const entityLabel = entityLabels[event.entity_name] || event.entity_name;
    const action = actionLabels[event.type] || event.type;
    const entityId = event.entity_id;

    let description = '';

    if (event.type === 'create') {
      const nameField = data?.full_name || data?.name || data?.sale_number || data?.quote_number || data?.test_number || data?.order_number || data?.reference || '';
      description = `${entityLabel} "${nameField}" criado por ${userName}`;
    } else if (event.type === 'update') {
      const nameField = data?.full_name || data?.name || data?.sale_number || data?.quote_number || data?.test_number || data?.order_number || data?.reference || entityId;
      const changedList = changed_fields?.length > 0 ? changed_fields.join(', ') : 'campos diversos';
      description = `${entityLabel} "${nameField}" editado: ${changedList} (por ${userName})`;
    } else if (event.type === 'delete') {
      const nameField = data?.full_name || data?.name || data?.sale_number || data?.quote_number || data?.test_number || data?.order_number || data?.reference || entityId;
      description = `${entityLabel} "${nameField}" excluído por ${userName}`;
    }

    const result = await base44.entities.AuditLog.create({
      entity_type: entityLabel,
      entity_id: entityId,
      action,
      description,
      details: {
        event: event.type,
        entity_name: event.entity_name,
        changed_fields: changed_fields || []
      }
    });

    return Response.json({ success: true, description, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});