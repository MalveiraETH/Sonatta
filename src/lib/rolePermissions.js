// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  admin: {
    // Clientes
    clients: ['create', 'read', 'update', 'delete'],
    // Vendas
    sales: ['create', 'read', 'update', 'delete', 'export'],
    // Agendamentos
    appointments: ['create', 'read', 'update', 'delete'],
    // Estoque
    inventory: ['create', 'read', 'update', 'delete'],
    // Orçamentos
    quotes: ['create', 'read', 'update', 'delete', 'convert'],
    // Contratos
    contracts: ['create', 'read', 'update', 'delete'],
    // Consertos
    repairs: ['create', 'read', 'update', 'delete'],
    // Financeiro
    financeiro: ['create', 'read', 'update', 'delete'],
    // Testes
    tests: ['create', 'read', 'update', 'delete'],
    // Profissionais
    professionals: ['create', 'read', 'update', 'delete'],
    // Cadastros
    registrations: ['create', 'read', 'update', 'delete'],
    // Relatórios
    reports: ['read', 'export'],
    // Analytics
    analytics: ['read'],
    // Webhooks (admin only)
    webhooks: ['create', 'read', 'update', 'delete'],
    // API Docs
    apidocs: ['read'],
    // Backup
    backup: ['create', 'read', 'restore'],
    // Usuários
    users: ['create', 'read', 'update', 'delete'],
    // Configurações
    settings: ['read', 'update'],
  },

  fonoaudiologo: {
    // Clientes
    clients: ['read'],
    // Agendamentos
    appointments: ['create', 'read', 'update'],
    // Testes
    tests: ['create', 'read', 'update'],
    // Profissionais
    professionals: ['read'],
    // Relatórios
    reports: ['read'],
    // Analytics
    analytics: ['read'],
    // API Docs
    apidocs: ['read'],
  },

  comercial: {
    // Clientes (full)
    clients: ['create', 'read', 'update'],
    // Vendas (full)
    sales: ['create', 'read', 'update', 'export'],
    // Agendamentos
    appointments: ['create', 'read'],
    // Estoque (read only)
    inventory: ['read'],
    // Orçamentos (full)
    quotes: ['create', 'read', 'update', 'convert'],
    // Contratos (read)
    contracts: ['read'],
    // Profissionais (read)
    professionals: ['read'],
    // Relatórios
    reports: ['read', 'export'],
    // Analytics
    analytics: ['read'],
    // API Docs
    apidocs: ['read'],
  },

  recepcao: {
    // Clientes (read only)
    clients: ['read'],
    // Agendamentos (full)
    appointments: ['create', 'read', 'update'],
    // Profissionais (read)
    professionals: ['read'],
    // API Docs
    apidocs: ['read'],
  },

  financeiro: {
    // Clientes (read)
    clients: ['read'],
    // Vendas (read)
    sales: ['read'],
    // Financeiro (full)
    financeiro: ['read', 'update'],
    // Relatórios (full)
    reports: ['read', 'export'],
    // Analytics (read)
    analytics: ['read'],
    // API Docs
    apidocs: ['read'],
  },
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
};

export function canAccess(userRole, resource, action) {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;

  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;

  return resourcePerms.includes(action);
}

export function getPageAccessByRole(userRole) {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return [];

  const pageMap = {
    clients: 'Clients',
    sales: 'Sales',
    appointments: 'Appointments',
    inventory: 'Inventory',
    quotes: 'Quotes',
    contracts: 'Contracts',
    repairs: 'DeviceRepairs',
    financeiro: 'Financeiro',
    tests: 'Tests',
    professionals: 'Professionals',
    registrations: 'Registrations',
    reports: 'Reports',
    analytics: 'Analytics',
    webhooks: 'Webhooks',
    apidocs: 'ApiDocs',
    backup: 'UsageDashboard',
    settings: 'Settings',
  };

  return Object.keys(permissions).map(perm => pageMap[perm]).filter(Boolean);
}