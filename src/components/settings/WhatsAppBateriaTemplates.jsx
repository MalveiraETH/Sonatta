import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, RotateCcw, CheckCircle2, Info, Baby, UserCheck } from 'lucide-react';

const AGE_GROUPS = [
  {
    key: 'menor',
    label: 'Menor de 18 anos',
    sublabel: 'Responsável pelo cliente',
    icon: Baby,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  {
    key: 'maior',
    label: 'Maior de 18 anos',
    sublabel: 'Adulto independente',
    icon: UserCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
];

const DEFAULT_MESSAGES = {
  menor: `Olá, {{nome}}! 👶

Aqui é da *Sonatta Soluções Auditivas*.

Notamos que já faz um tempo desde a última compra de baterias/pilhas para o aparelho auditivo do(a) pequeno(a). Queremos garantir que o dispositivo continue funcionando perfeitamente! 🦻

Temos baterias de alta qualidade disponíveis. Entre em contato ou passe aqui na clínica.

_Sonatta Soluções Auditivas_`,
  maior: `Olá, {{nome}}! 😊

Aqui é da *Sonatta Soluções Auditivas*.

Notamos que faz um tempo desde a sua última compra de baterias/pilhas, e queremos garantir que seu aparelho auditivo continue funcionando perfeitamente. 🦻✨

Temos baterias de alta qualidade disponíveis para você! Entre em contato ou passe aqui na clínica.

_Sonatta Soluções Auditivas_`,
};

// Chave usada no MessageTemplate para identificar templates de bateria
// age_group: 'bateria_menor' | 'bateria_maior'

export default function WhatsAppBateriaTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editMap, setEditMap]     = useState({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const list = await base44.entities.MessageTemplate.filter({ message_type: 'bateria' });
      setTemplates(list || []);
    } catch (e) { console.error(e); }
  };

  const tmplMap = {};
  templates.forEach(t => { tmplMap[t.age_group] = t; });

  const getValue = (groupKey) => {
    const storeKey = `bateria_${groupKey}`;
    if (storeKey in editMap) return editMap[storeKey];
    return tmplMap[storeKey]?.message || DEFAULT_MESSAGES[groupKey] || '';
  };

  const setValue = (groupKey, val) => {
    setEditMap(prev => ({ ...prev, [`bateria_${groupKey}`]: val }));
  };

  const resetValue = (groupKey) => {
    const storeKey = `bateria_${groupKey}`;
    setEditMap(prev => { const n = { ...prev }; delete n[storeKey]; return n; });
  };

  const isDirty = (groupKey) => `bateria_${groupKey}` in editMap;

  const saveAll = async () => {
    setSaving(true);
    try {
      const ops = [];
      for (const [storeKey, message] of Object.entries(editMap)) {
        const existing = tmplMap[storeKey];
        const groupLabel = storeKey === 'bateria_menor' ? 'Menor de 18 anos' : 'Maior de 18 anos';
        const name = `Bateria — ${groupLabel}`;
        if (existing) {
          ops.push(base44.entities.MessageTemplate.update(existing.id, { message, name, is_active: true }));
        } else {
          ops.push(base44.entities.MessageTemplate.create({
            name,
            age_group: storeKey,
            priority: 'todas',
            message,
            message_type: 'bateria',
            is_active: true,
          }));
        }
      }
      await Promise.all(ops);
      await loadTemplates();
      setEditMap({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const dirtyCount = Object.keys(editMap).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Templates WhatsApp — Gestão de Baterias</h2>
          <p className="text-sm text-slate-500 mt-1">
            Mensagens enviadas para clientes que compraram baterias/pilhas e estão no ciclo de reposição.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {dirtyCount > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-medium">
              {dirtyCount} alteração{dirtyCount > 1 ? 'ões' : ''} não salva{dirtyCount > 1 ? 's' : ''}
            </span>
          )}
          <Button
            onClick={saveAll}
            disabled={saving || dirtyCount === 0}
            className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white gap-2"
          >
            {saved
              ? <><CheckCircle2 className="h-4 w-4" /> Salvo!</>
              : <><Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar alterações'}</>
            }
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          Use <code className="bg-blue-100 px-1.5 rounded font-mono text-xs">{'{{nome}}'}</code> para o primeiro nome do cliente.
          O critério de separação é a data de nascimento cadastrada: <strong>menores e maiores de 18 anos</strong>.
          Se o cliente não tiver data de nascimento, será usado o template de maior de 18 anos.
        </span>
      </div>

      {/* Editores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {AGE_GROUPS.map(group => {
          const Icon = group.icon;
          const val = getValue(group.key);
          const dirty = isDirty(group.key);

          return (
            <div
              key={group.key}
              className={`rounded-xl border-2 transition-all ${dirty ? 'border-amber-300' : group.border}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${group.bg}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${group.color}`} />
                  <div>
                    <p className={`font-semibold text-sm ${group.color}`}>{group.label}</p>
                    <p className="text-xs text-slate-400">{group.sublabel}</p>
                  </div>
                  {dirty && (
                    <span className="text-[11px] bg-amber-100 text-amber-600 font-medium px-2 py-0.5 rounded-full ml-1">editado</span>
                  )}
                </div>
                {dirty && (
                  <button
                    onClick={() => resetValue(group.key)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Desfazer
                  </button>
                )}
              </div>
              <div className="p-4 bg-white rounded-b-xl">
                <Textarea
                  value={val}
                  onChange={e => setValue(group.key, e.target.value)}
                  rows={10}
                  className="text-sm rounded-xl resize-none"
                  placeholder={`Mensagem para clientes ${group.label.toLowerCase()}...`}
                />
                <p className="text-[11px] text-slate-400 mt-2">{val.length} caracteres</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}