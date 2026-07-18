import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Mapeamento de página (key do PAGES) para módulo
export const PAGE_PERMISSION_MAP = {
  Dashboard:        'Dashboard',
  Clients:          'Clientes',
  ClientDetail:     'Clientes',
  Appointments:     'Agendamentos',
  Tests:            'Testes',
  Inventory:        'Estoque',
  ProductDetail:    'Estoque',
  Quotes:           'Orçamentos',
  Sales:            'Vendas',
  Financeiro:       'Financeiro',
  AccountsPayable:  'Financeiro',
  AccountsReceivable: 'Financeiro',
  PixReport:        'Financeiro',
  Professionals:    'Profissionais',
  Contracts:        'Contratos',
  MoldOrders:           'Moldes & Tampões',
  DeviceRepairs:        'Consertos',
  VendasPerdidas:       'Vendas Perdidas',
  AssistenteSonatta:    'Assistente IA',
  Reports:              'Relatórios',
  Registrations:        'Cadastros',
  Settings:             'Configurações',
};

// Defaults caso não haja registros salvos
const DEFAULT_PERMISSIONS = [
  { module: 'Dashboard',      action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Criar/Editar clientes',    admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Excluir clientes',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Agendamentos',   action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Agendamentos',   action: 'Criar/Editar agendamentos',admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Agendamentos',   action: 'Excluir agendamentos',     admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Testes',         action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Testes',         action: 'Criar/Editar testes',      admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Testes',         action: 'Excluir testes',           admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque',        action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Estoque',        action: 'Criar/Editar produtos',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque',        action: 'Excluir produtos',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Orçamentos',     action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Orçamentos',     action: 'Criar/Editar orçamentos',  admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Orçamentos',     action: 'Excluir orçamentos',       admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Vendas',         action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Vendas',         action: 'Criar vendas',             admin: true, fonoaudiologo: false, comercial: true,  recepcao: true },
  { module: 'Vendas',         action: 'Excluir vendas',           admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',     action: 'Ver página',                admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',     action: 'Criar/Editar despesas',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',     action: 'Excluir despesas',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Profissionais',  action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Profissionais',  action: 'Criar/Editar profissionais',admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Contratos',      action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Contratos',      action: 'Gerar contratos',          admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Consertos',      action: 'Ver página',                admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Consertos',      action: 'Criar/Editar consertos',   admin: true, fonoaudiologo: true,  comercial: false, recepcao: false },
  { module: 'Consertos',      action: 'Excluir consertos',        admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Vendas Perdidas', action: 'Ver página',               admin: true, fonoaudiologo: false, comercial: true,  recepcao: false },
  { module: 'Assistente IA',  action: 'Ver página',                admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Relatórios',     action: 'Ver página',                admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Cadastros',      action: 'Ver página',                admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações',  action: 'Ver página',                admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações',  action: 'Gerenciar usuários',       admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
];

let cachedPerms = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minuto

async function fetchPermissions() {
  const now = Date.now();
  if (cachedPerms && now - cacheTime < CACHE_TTL) return cachedPerms;
  let records = [];
  try {
    const res = await base44.functions.invoke('getEffectivePermissions', {});
    records = res?.data?.permissions || [];
  } catch (e) {
    // Falha ao buscar permissões — usa defaults
    records = [];
  }
  const merged = DEFAULT_PERMISSIONS.map(def => {
    const saved = records.find(r => r.module === def.module && r.action === def.action);
    if (saved) {
      // Garante que sempre tem os campos de role (admin, fonoaudiologo, comercial, recepcao)
      return {
        ...def,
        admin: saved.admin !== undefined ? saved.admin : def.admin,
        fonoaudiologo: saved.fonoaudiologo !== undefined ? saved.fonoaudiologo : def.fonoaudiologo,
        comercial: saved.comercial !== undefined ? saved.comercial : def.comercial,
        recepcao: saved.recepcao !== undefined ? saved.recepcao : def.recepcao,
      };
    }
    return { ...def };
  });
  cachedPerms = merged;
  cacheTime = now;
  return merged;
}

export function invalidatePermissionCache() {
  cachedPerms = null;
  cacheTime = 0;
}

export function usePermissions(user) {
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchPermissions().then(p => { setPerms(p); setLoading(false); });
  }, [user]);

  const can = useCallback((module, action) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // admin sempre tem acesso total, independente de loading
    if (loading) return false; // outros roles aguardam o carregamento
    const p = perms.find(p => p.module === module && p.action === action);
    if (!p) return false;
    return !!p[user.role];
  }, [perms, user, loading]);

  const canAccessPage = useCallback((pageName) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // admin sempre tem acesso total, independente de loading
    if (loading) return false; // outros roles aguardam o carregamento
    const module = PAGE_PERMISSION_MAP[pageName];
    if (!module) return true; // página sem restrição mapeada
    return can(module, 'Ver página');
  }, [can, user, loading]);

  return { can, canAccessPage, loading };
}