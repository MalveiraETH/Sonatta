import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { invalidatePermissionCache, DEFAULT_PERMISSIONS } from '@/lib/usePermissions';

const roles = [
  { key: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  { key: 'fonoaudiologo', label: 'Fonoaudiólogo(a)', color: 'bg-blue-100 text-blue-700' },
  { key: 'comercial', label: 'Consultor Comercial', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'recepcao', label: 'Recepção', color: 'bg-amber-100 text-amber-700' },
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

    // Remove registros órfãos do banco (módulos/ações que não existem mais no DEFAULT_PERMISSIONS)
    const validKeys = new Set(DEFAULT_PERMISSIONS.map(d => `${d.module}|${d.action}`));
    const orphans = records.filter(r => !validKeys.has(`${r.module}|${r.action}`));
    if (orphans.length > 0) {
      await Promise.all(orphans.map(r => base44.entities.PermissionSettings.delete(r.id)));
    }

    const idMap = {};
    records.forEach(r => {
      if (validKeys.has(`${r.module}|${r.action}`)) {
        idMap[`${r.module}|${r.action}`] = r.id;
      }
    });

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
    try {
      const newIds = { ...savedIds };
      await Promise.all(
        perms.map(async (p) => {
          const key = `${p.module}|${p.action}`;
          const data = { module: p.module, action: p.action, admin: true, fonoaudiologo: !!p.fonoaudiologo, comercial: !!p.comercial, recepcao: !!p.recepcao };
          if (newIds[key]) {
            await base44.entities.PermissionSettings.update(newIds[key], data);
          } else {
            const created = await base44.entities.PermissionSettings.create(data);
            newIds[key] = created.id;
          }
        })
      );
      setSavedIds(newIds);
      invalidatePermissionCache();
      toast.success('Permissões salvas com sucesso!');
      setDirty(false);
    } catch (e) {
      toast.error('Erro ao salvar permissões. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      // Busca todos os registros atuais do banco (inclui registros órfãos de nomes antigos)
      const allRecords = await base44.entities.PermissionSettings.list();
      await Promise.all(allRecords.map(r => base44.entities.PermissionSettings.delete(r.id)));
      setSavedIds({});
      const defaults = DEFAULT_PERMISSIONS.map(d => ({ ...d }));
      setPerms(defaults);
      // Persiste os defaults no banco imediatamente para evitar estado inconsistente
      const newIds = {};
      await Promise.all(
        defaults.map(async (p) => {
          const data = { module: p.module, action: p.action, admin: true, fonoaudiologo: !!p.fonoaudiologo, comercial: !!p.comercial, recepcao: !!p.recepcao };
          const created = await base44.entities.PermissionSettings.create(data);
          newIds[`${p.module}|${p.action}`] = created.id;
        })
      );
      setSavedIds(newIds);
      setDirty(false);
      invalidatePermissionCache();
      toast.success('Permissões restauradas para o padrão');
    } catch (e) {
      toast.error('Erro ao restaurar permissões. Tente novamente.');
    } finally {
      setSaving(false);
    }
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