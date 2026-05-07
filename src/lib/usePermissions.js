import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Mapeamento de página (key do PAGES) para módulo e ação "Visualizar X"
export const PAGE_PERMISSION_MAP = {
  Dashboard:        { module: 'Dashboard',      action: 'Visualizar Dashboard' },
  Clients:          { module: 'Clientes',        action: 'Visualizar clientes' },
  ClientDetail:     { module: 'Clientes',        action: 'Visualizar clientes' },
  Appointments:     { module: 'Agendamentos',    action: 'Visualizar agendamentos' },
  Tests:            { module: 'Testes',           action: 'Visualizar testes' },
  Inventory:        { module: 'Estoque',          action: 'Visualizar estoque' },
  ProductDetail:    { module: 'Estoque',          action: 'Visualizar estoque' },
  Quotes:           { module: 'Orçamentos',       action: 'Visualizar orçamentos' },
  Sales:            { module: 'Vendas',           action: 'Visualizar vendas' },
  Financeiro:       { module: 'Financeiro',       action: 'Visualizar financeiro' },
  AccountsPayable:  { module: 'Financeiro',       action: 'Visualizar financeiro' },
  AccountsReceivable:{ module: 'Financeiro',      action: 'Visualizar financeiro' },
  PixReport:        { module: 'Financeiro',       action: 'Visualizar financeiro' },
  Professionals:    { module: 'Profissionais',    action: 'Visualizar profissionais' },
  Contracts:        { module: 'Contratos',        action: 'Visualizar contratos' },
  Reports:          { module: 'Relatórios',       action: 'Visualizar relatórios' },
  Registrations:    { module: 'Configurações',    action: 'Acessar configurações' },
  Settings:         { module: 'Configurações',    action: 'Acessar configurações' },
};

// Defaults caso não haja registros salvos
const DEFAULT_PERMISSIONS = [
  { module: 'Dashboard',      action: 'Visualizar Dashboard',     admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Visualizar clientes',      admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Criar/Editar clientes',    admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Clientes',       action: 'Excluir clientes',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Agendamentos',   action: 'Visualizar agendamentos',  admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Agendamentos',   action: 'Criar/Editar agendamentos',admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Agendamentos',   action: 'Excluir agendamentos',     admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Testes',          action: 'Visualizar testes',        admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Testes',          action: 'Criar/Editar testes',      admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Testes',          action: 'Excluir testes',           admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque',         action: 'Visualizar estoque',       admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Estoque',         action: 'Criar/Editar produtos',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque',         action: 'Excluir produtos',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Orçamentos',      action: 'Visualizar orçamentos',    admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Orçamentos',      action: 'Criar/Editar orçamentos',  admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Orçamentos',      action: 'Excluir orçamentos',       admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Vendas',          action: 'Visualizar vendas',        admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Vendas',          action: 'Criar vendas',             admin: true, fonoaudiologo: false, comercial: true,  recepcao: false },
  { module: 'Vendas',          action: 'Excluir vendas',           admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',      action: 'Visualizar financeiro',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',      action: 'Criar/Editar despesas',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro',      action: 'Excluir despesas',         admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Profissionais',   action: 'Visualizar profissionais', admin: true, fonoaudiologo: true,  comercial: true,  recepcao: true },
  { module: 'Profissionais',   action: 'Criar/Editar profissionais',admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Contratos',       action: 'Visualizar contratos',     admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Contratos',       action: 'Gerar contratos',          admin: true, fonoaudiologo: true,  comercial: true,  recepcao: false },
  { module: 'Relatórios',      action: 'Visualizar relatórios',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações',   action: 'Acessar configurações',    admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações',   action: 'Gerenciar usuários',       admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
];

let cachedPerms = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minuto

async function fetchPermissions() {
  const now = Date.now();
  if (cachedPerms && now - cacheTime < CACHE_TTL) return cachedPerms;
  const records = await base44.entities.PermissionSettings.list();
  const merged = DEFAULT_PERMISSIONS.map(def => {
    const saved = records.find(r => r.module === def.module && r.action === def.action);
    return saved ? { ...def, ...saved } : { ...def };
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
    if (user.role === 'admin') return true;
    const p = perms.find(p => p.module === module && p.action === action);
    if (!p) return false;
    return !!p[user.role];
  }, [perms, user]);

  const canAccessPage = useCallback((pageName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const mapping = PAGE_PERMISSION_MAP[pageName];
    if (!mapping) return true; // página sem restrição
    return can(mapping.module, mapping.action);
  }, [can, user]);

  return { can, canAccessPage, loading };
}