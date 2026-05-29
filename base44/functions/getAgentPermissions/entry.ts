import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITY_LABELS = {
  Client: 'Clientes',
  Appointment: 'Agendamentos',
  Test: 'Testes',
  Product: 'Produtos / Estoque',
  StockMovement: 'Movimentações de Estoque',
  Quote: 'Orçamentos',
  Sale: 'Vendas',
  Contract: 'Contratos',
  Installment: 'Parcelas',
  ServiceHistory: 'Histórico de Serviços',
  Professional: 'Profissionais',
  Expense: 'Despesas',
  ExpenseCategory: 'Categorias de Despesa',
  ReferenceProduct: 'Produtos de Referência',
  DeviceRepair: 'Consertos',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'agent_permissions' });
    let toolConfigs;

    if (settings.length > 0) {
      toolConfigs = settings[0].setting_value?.tool_configs || [];
    } else {
      // Defaults do agente
      toolConfigs = [
        { entity_name: 'Client', allowed_operations: ['read', 'update'] },
        { entity_name: 'Appointment', allowed_operations: ['read', 'create', 'update'] },
        { entity_name: 'Test', allowed_operations: ['read', 'update'] },
        { entity_name: 'Product', allowed_operations: ['read'] },
        { entity_name: 'StockMovement', allowed_operations: ['read'] },
        { entity_name: 'Quote', allowed_operations: ['read', 'update'] },
        { entity_name: 'Sale', allowed_operations: ['read'] },
        { entity_name: 'Contract', allowed_operations: ['read'] },
        { entity_name: 'Installment', allowed_operations: ['read', 'update'] },
        { entity_name: 'ServiceHistory', allowed_operations: ['read', 'create'] },
        { entity_name: 'Professional', allowed_operations: ['read'] },
        { entity_name: 'Expense', allowed_operations: ['read'] },
        { entity_name: 'ExpenseCategory', allowed_operations: ['read'] },
        { entity_name: 'ReferenceProduct', allowed_operations: ['read'] },
      ];
    }

    const result = toolConfigs.map(tc => ({
      entity_name: tc.entity_name,
      label: ENTITY_LABELS[tc.entity_name] || tc.entity_name,
      allowed_operations: tc.allowed_operations || [],
    }));

    return Response.json({ tool_configs: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});