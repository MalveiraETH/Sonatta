import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Baby, GraduationCap, UserCheck, AlertTriangle,
  Clock, TrendingDown, MessageSquare, Megaphone,
  Save, RotateCcw, Plus, Trash2, CheckCircle2, Info
} from 'lucide-react';

// ─── Configurações ─────────────────────────────────────────────────────────────

const AGE_GROUPS = [
  { key: 'bebes',    label: 'Bebês',              sublabel: '0 a 1 ano',   icon: Baby,          color: 'text-pink-600',   bg: 'bg-pink-50',    border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700' },
  { key: 'criancas', label: 'Crianças/Adolesc.',  sublabel: '1 a 15 anos', icon: GraduationCap, color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'adultos',  label: 'Adultos',            sublabel: '+15 anos',    icon: UserCheck,     color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
];

const PRIORITIES = [
  { key: 'alta',  label: 'Alta',  icon: AlertTriangle, color: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
  { key: 'media', label: 'Média', icon: Clock,         color: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  { key: 'baixa', label: 'Baixa', icon: TrendingDown,  color: 'text-slate-500',  badge: 'bg-slate-100 text-slate-600' },
];

const MESSAGE_TYPES = [
  {
    key: 'padrao',
    label: 'Mensagem Padrão',
    icon: MessageSquare,
    description: 'Enviada individualmente para cada cliente direto pela lista.',
    color: 'text-[#6B3FA0]',
    bg: 'bg-[#6B3FA0]/5',
    border: 'border-[#6B3FA0]/20',
    activeBorder: 'border-[#6B3FA0]',
    activeBg: 'bg-[#6B3FA0]',
  },
  {
    key: 'campanha',
    label: 'Mensagem de Campanha',
    icon: Megaphone,
    description: 'Usada nos disparos em massa por grupo etário.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    activeBorder: 'border-orange-500',
    activeBg: 'bg-orange-500',
  },
];

const DEFAULT_MESSAGES = {
  padrao: {
    bebes:    `Olá, {{nome}}! 👶\n\nAqui é a equipe Sonatta. Sabemos que cuidar da audição do(a) seu(sua) bebê é uma prioridade. Gostaríamos de acompanhar como estão as coisas e ver se podemos ajudar. Estamos à disposição! 😊`,
    criancas: `Olá, {{nome}}! 🎒\n\nAqui é a equipe Sonatta. Temos aparelhos auditivos especialmente desenvolvidos para crianças e adolescentes, discretos e confortáveis para o dia a dia. Quando podemos conversar?`,
    adultos:  `Olá, {{nome}}! 😊\n\nAqui é a equipe Sonatta. Você testou o {{aparelho}} conosco e gostaríamos de saber se ficou com alguma dúvida. Temos condições especiais e podemos ajudar a encontrar a melhor solução para você!`,
  },
  campanha: {
    bebes:    `Olá, {{nome}}! 👶\n\nA Sonatta está com uma campanha especial para bebês com perda auditiva. Aparelhos modernos, leves e com garantia estendida. Entre em contato e saiba mais!`,
    criancas: `Olá, {{nome}}! 🎒\n\nA Sonatta preparou uma campanha exclusiva para crianças e adolescentes! Aparelhos discretos com conectividade e ótimo custo-benefício. Fale conosco!`,
    adultos:  `Olá, {{nome}}! 😊\n\nA Sonatta está com condições especiais neste mês! Aparelhos auditivos modernos que conectam ao celular, com parcelas facilitadas. Aproveite e entre em contato!`,
  },
};

// ─── Componente ────────────────────────────────────────────────────────────────

export default function WhatsAppCampaignTemplates() {
  const [templates, setTemplates]     = useState([]);
  const [activeType, setActiveType]   = useState('padrao');
  const [activeGroup, setActiveGroup] = useState('adultos');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [editMap, setEditMap]         = useState({}); // key: `${type}_${group}_${prio}` → text

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const list = await base44.entities.MessageTemplate.filter({});
      setTemplates(list || []);
    } catch (e) { console.error(e); }
  };

  // Builds a lookup: type_group_priority → template record
  const tmplMap = {};
  templates.forEach(t => {
    const key = `${t.message_type || 'padrao'}_${t.age_group}_${t.priority}`;
    tmplMap[key] = t;
  });

  const getValue = (type, group, prio) => {
    const editKey = `${type}_${group}_${prio}`;
    if (editKey in editMap) return editMap[editKey];
    const stored = tmplMap[editKey];
    if (stored) return stored.message;
    return DEFAULT_MESSAGES[type]?.[group] || '';
  };

  const setValue = (type, group, prio, val) => {
    setEditMap(prev => ({ ...prev, [`${type}_${group}_${prio}`]: val }));
  };

  const resetValue = (type, group, prio) => {
    const editKey = `${type}_${group}_${prio}`;
    setEditMap(prev => {
      const next = { ...prev };
      delete next[editKey];
      return next;
    });
  };

  const isDirty = (type, group, prio) => {
    const editKey = `${type}_${group}_${prio}`;
    return editKey in editMap;
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const ops = [];
      for (const [editKey, message] of Object.entries(editMap)) {
        const [type, group, prio] = editKey.split('_');
        const existing = tmplMap[editKey];
        const groupCfg = AGE_GROUPS.find(g => g.key === group);
        const prioCfg  = PRIORITIES.find(p => p.key === prio);
        const name = `${groupCfg?.label || group} — ${prioCfg?.label || prio} (${type === 'padrao' ? 'Padrão' : 'Campanha'})`;

        if (existing) {
          ops.push(base44.entities.MessageTemplate.update(existing.id, { message, name, is_active: true }));
        } else {
          ops.push(base44.entities.MessageTemplate.create({
            name,
            age_group: group,
            priority: prio,
            message,
            message_type: type,
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
  const currentType = MESSAGE_TYPES.find(t => t.key === activeType);
  const currentGroup = AGE_GROUPS.find(g => g.key === activeGroup);
  const TypeIcon = currentType?.icon;
  const GroupIcon = currentGroup?.icon;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Templates de WhatsApp — Vendas Perdidas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure as mensagens enviadas para clientes que testaram aparelhos mas não compraram.
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

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          Use <code className="bg-blue-100 px-1.5 rounded font-mono text-xs">{'{{nome}}'}</code> para o primeiro nome do cliente
          e <code className="bg-blue-100 px-1.5 rounded font-mono text-xs">{'{{aparelho}}'}</code> para o aparelho testado.
        </span>
      </div>

      {/* Tipo de mensagem */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tipo de mensagem</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MESSAGE_TYPES.map(mt => {
            const Icon = mt.icon;
            const isActive = activeType === mt.key;
            return (
              <button
                key={mt.key}
                onClick={() => setActiveType(mt.key)}
                className={`text-left p-4 rounded-xl border-2 transition-all
                  ${isActive ? `${mt.activeBorder} ${mt.bg}` : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? mt.bg : 'bg-slate-100'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? mt.color : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isActive ? mt.color : 'text-slate-700'}`}>{mt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{mt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupo etário */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Grupo etário</p>
        <div className="grid grid-cols-3 gap-3">
          {AGE_GROUPS.map(g => {
            const Icon = g.icon;
            const isActive = activeGroup === g.key;
            const hasDirty = PRIORITIES.some(p => isDirty(activeType, g.key, p.key));
            return (
              <button
                key={g.key}
                onClick={() => setActiveGroup(g.key)}
                className={`relative text-left p-3 rounded-xl border-2 transition-all
                  ${isActive ? `${g.border} ${g.bg}` : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                {hasDirty && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                )}
                <Icon className={`h-5 w-5 mb-1.5 ${isActive ? g.color : 'text-slate-400'}`} />
                <p className={`font-semibold text-xs ${isActive ? g.color : 'text-slate-600'}`}>{g.label}</p>
                <p className="text-[11px] text-slate-400">{g.sublabel}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editores por prioridade */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Mensagem por prioridade — {currentGroup?.label}
        </p>

        {PRIORITIES.map(prio => {
          const PrioIcon = prio.icon;
          const val = getValue(activeType, activeGroup, prio.key);
          const dirty = isDirty(activeType, activeGroup, prio.key);

          return (
            <div key={prio.key} className={`rounded-xl border transition-all ${dirty ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PrioIcon className={`h-4 w-4 ${prio.color}`} />
                  <span className="text-sm font-semibold text-slate-700">Prioridade {prio.label}</span>
                  {dirty && (
                    <span className="text-[11px] bg-amber-100 text-amber-600 font-medium px-2 py-0.5 rounded-full">editado</span>
                  )}
                </div>
                {dirty && (
                  <button
                    onClick={() => resetValue(activeType, activeGroup, prio.key)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Desfazer
                  </button>
                )}
              </div>
              <div className="p-4">
                <Textarea
                  value={val}
                  onChange={e => setValue(activeType, activeGroup, prio.key, e.target.value)}
                  rows={5}
                  className="text-sm rounded-xl resize-none bg-white"
                  placeholder={`Digite a mensagem para clientes ${currentGroup?.label?.toLowerCase()} com prioridade ${prio.label.toLowerCase()}...`}
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