import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Check, X } from 'lucide-react';

const roles = [
  { key: 'admin', label: 'Administrador' },
  { key: 'fonoaudiologo', label: 'Fonoaudiólogo(a)' },
  { key: 'comercial', label: 'Consultor Comercial' },
  { key: 'recepcao', label: 'Recepção' },
];

const permissions = [
  {
    module: 'Dashboard',
    actions: [
      { label: 'Visualizar Dashboard', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
    ],
  },
  {
    module: 'Clientes',
    actions: [
      { label: 'Visualizar clientes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar clientes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Excluir clientes', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Agendamentos',
    actions: [
      { label: 'Visualizar agendamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar agendamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Excluir agendamentos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Testes',
    actions: [
      { label: 'Visualizar testes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar testes', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
      { label: 'Excluir testes', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Estoque',
    actions: [
      { label: 'Visualizar estoque', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar produtos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
      { label: 'Excluir produtos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Orçamentos',
    actions: [
      { label: 'Visualizar orçamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar orçamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
      { label: 'Excluir orçamentos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Vendas',
    actions: [
      { label: 'Visualizar vendas', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar vendas', admin: true, fonoaudiologo: false, comercial: true, recepcao: false },
      { label: 'Excluir vendas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Financeiro',
    actions: [
      { label: 'Visualizar financeiro', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
      { label: 'Criar/Editar despesas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
      { label: 'Excluir despesas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Profissionais',
    actions: [
      { label: 'Visualizar profissionais', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
      { label: 'Criar/Editar profissionais', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Contratos',
    actions: [
      { label: 'Visualizar contratos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
      { label: 'Gerar contratos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
    ],
  },
  {
    module: 'Relatórios',
    actions: [
      { label: 'Visualizar relatórios', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
  {
    module: 'Configurações',
    actions: [
      { label: 'Acessar configurações', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
      { label: 'Gerenciar usuários', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
    ],
  },
];

function PermIcon({ allowed }) {
  return allowed
    ? <Check className="h-4 w-4 text-emerald-500 mx-auto" />
    : <X className="h-4 w-4 text-slate-300 mx-auto" />;
}

export default function AccessPermissions() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-[#6B3FA0]" />
            Permissões por Papel
          </CardTitle>
          <p className="text-sm text-slate-500">
            Visão geral do que cada papel pode fazer no sistema. As permissões são aplicadas automaticamente conforme o papel atribuído ao usuário.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-semibold text-slate-700 min-w-[200px]">Módulo / Ação</th>
                {roles.map((r) => (
                  <th key={r.key} className="text-center py-3 px-4 font-semibold text-slate-700 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.key === 'admin' ? 'bg-purple-100 text-purple-700' :
                        r.key === 'fonoaudiologo' ? 'bg-blue-100 text-blue-700' :
                        r.key === 'comercial' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((module) => (
                <React.Fragment key={module.module}>
                  <tr className="bg-slate-50">
                    <td colSpan={roles.length + 1} className="py-2 px-2 font-semibold text-[#6B3FA0] text-xs uppercase tracking-wide">
                      {module.module}
                    </td>
                  </tr>
                  {module.actions.map((action) => (
                    <tr key={action.label} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-2.5 pr-4 text-slate-600 pl-4">{action.label}</td>
                      {roles.map((r) => (
                        <td key={r.key} className="py-2.5 px-4 text-center">
                          <PermIcon allowed={action[r.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}