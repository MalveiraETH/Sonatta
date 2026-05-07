import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const roles = [
  { key: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  { key: 'fonoaudiologo', label: 'Fonoaudiólogo(a)', color: 'bg-blue-100 text-blue-700' },
  { key: 'comercial', label: 'Consultor Comercial', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'recepcao', label: 'Recepção', color: 'bg-amber-100 text-amber-700' },
];

const DEFAULT_PERMISSIONS = [
  { module: 'Dashboard', action: 'Visualizar Dashboard', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Clientes', action: 'Visualizar clientes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Clientes', action: 'Criar/Editar clientes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Clientes', action: 'Excluir clientes', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Agendamentos', action: 'Visualizar agendamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Agendamentos', action: 'Criar/Editar agendamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Agendamentos', action: 'Excluir agendamentos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Testes', action: 'Visualizar testes', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Testes', action: 'Criar/Editar testes', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
  { module: 'Testes', action: 'Excluir testes', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque', action: 'Visualizar estoque', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Estoque', action: 'Criar/Editar produtos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Estoque', action: 'Excluir produtos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Orçamentos', action: 'Visualizar orçamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Orçamentos', action: 'Criar/Editar orçamentos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
  { module: 'Orçamentos', action: 'Excluir orçamentos', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Vendas', action: 'Visualizar vendas', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Vendas', action: 'Criar vendas', admin: true, fonoaudiologo: false, comercial: true, recepcao: false },
  { module: 'Vendas', action: 'Excluir vendas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro', action: 'Visualizar financeiro', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro', action: 'Criar/Editar despesas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Financeiro', action: 'Excluir despesas', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Profissionais', action: 'Visualizar profissionais', admin: true, fonoaudiologo: true, comercial: true, recepcao: true },
  { module: 'Profissionais', action: 'Criar/Editar profissionais', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Contratos', action: 'Visualizar contratos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
  { module: 'Contratos', action: 'Gerar contratos', admin: true, fonoaudiologo: true, comercial: true, recepcao: false },
  { module: 'Relatórios', action: 'Visualizar relatórios', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações', action: 'Acessar configurações', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
  { module: 'Configurações', action: 'Gerenciar usuários', admin: true, fonoaudiologo: false, comercial: false, recepcao: false },
];

export default function AccessPermissions() {
  const [perms, setPerms] = useState([]);
  const [savedIds, setSavedIds] = useState({}); // key: "module|action" -> record id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const records = await base44.entities.PermissionSettings.list();

    const idMap = {};
    records.forEach(r => { idMap[`${r.module}|${r.action}`] = r.id; });

    // Merge saved records over defaults
    const merged = DEFAULT_PERMISSIONS.map(def => {
      const saved = records.find(r => r.module === def.module && r.action === def.action);
      return saved
        ? { module: saved.module, action: saved.action, admin: saved.admin, fonoaudiologo: saved.fonoaudiologo, comercial: saved.comercial, recepcao: saved.recepcao }
        : { ...def };
    });

    setSavedIds(idMap);
    setPerms(merged);
    setDirty(false);
    setLoading(false);
  };

  const toggle = (moduleKey, actionKey, roleKey) => {
    if (roleKey === 'admin') return; // admin sempre tem acesso total
    setPerms(prev =>
      prev.map(p =>
        p.module === moduleKey && p.action === actionKey
          ? { ...p, [roleKey]: !p[roleKey] }
          : p
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      perms.map(async (p) => {
        const key = `${p.module}|${p.action}`;
        const data = { module: p.module, action: p.action, admin: p.admin, fonoaudiologo: p.fonoaudiologo, comercial: p.comercial, recepcao: p.recepcao };
        if (savedIds[key]) {
          await base44.entities.PermissionSettings.update(savedIds[key], data);
        } else {
          const created = await base44.entities.PermissionSettings.create(data);
          setSavedIds(prev => ({ ...prev, [key]: created.id }));
        }
      })
    );
    toast.success('Permissões salvas com sucesso!');
    setSaving(false);
    setDirty(false);
  };

  const handleReset = async () => {
    setSaving(true);
    // Delete all saved records and reload defaults
    await Promise.all(
      Object.values(savedIds).map(id => base44.entities.PermissionSettings.delete(id))
    );
    setSavedIds({});
    setPerms(DEFAULT_PERMISSIONS.map(d => ({ ...d })));
    setDirty(false);
    setSaving(false);
    toast.success('Permissões restauradas para o padrão');
  };

  // Group perms by module
  const modules = [...new Set(perms.map(p => p.module))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-[#6B3FA0]" />
                Permissões por Papel
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Clique nos checkboxes para habilitar ou desabilitar permissões. O papel <strong>Administrador</strong> sempre tem acesso total.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Padrão
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-semibold text-slate-700 min-w-[220px]">Módulo / Ação</th>
                {roles.map((r) => (
                  <th key={r.key} className="text-center py-3 px-4 font-semibold text-slate-700 min-w-[130px]">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
                      {r.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <React.Fragment key={mod}>
                  <tr className="bg-slate-50">
                    <td colSpan={roles.length + 1} className="py-2 px-2 font-semibold text-[#6B3FA0] text-xs uppercase tracking-wide">
                      {mod}
                    </td>
                  </tr>
                  {perms.filter(p => p.module === mod).map((perm) => (
                    <tr key={perm.action} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-2.5 pr-4 text-slate-600 pl-4">{perm.action}</td>
                      {roles.map((r) => (
                        <td key={r.key} className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!perm[r.key]}
                            onChange={() => toggle(perm.module, perm.action, r.key)}
                            disabled={r.key === 'admin'}
                            className="w-4 h-4 rounded accent-[#6B3FA0] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
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

      {dirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#6B3FA0] hover:bg-[#5a3388] text-white shadow-lg gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  );
}