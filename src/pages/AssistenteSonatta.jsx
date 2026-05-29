import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bot, MessageCircle, Shield, Bell, BellOff,
  Clock, Zap, Users, Package, Wrench, CreditCard,
  FileText, CalendarClock, CheckCircle2, Loader2, Pencil, Save, X
} from 'lucide-react';
import { toast } from 'sonner';

const AGENT_NAME = 'assistente_sonatta';
const SETTINGS_KEY = 'alertas_config';

// ── Definição dos alertas ─────────────────────────────────────────────────────
const ALERT_GROUPS = [
  {
    group: 'Testes',
    icon: CalendarClock,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    alerts: [
      { key: 'teste_pendente', label: 'Teste Pendente', desc: 'Avisa quando um teste entra em status pendente', type: 'evento' },
      { key: 'teste_estendido', label: 'Teste Estendido', desc: 'Avisa quando um teste tem a data prorrogada', type: 'evento' },
      { key: 'teste_finalizado_sem_orcamento', label: 'Teste Finalizado sem Orçamento', desc: 'Alerta 2 dias após finalização se nenhum orçamento foi registrado', type: 'diário' },
      { key: 'aparelho_em_teste_longo', label: 'Aparelho em Teste Longo', desc: 'Alerta nos marcos de 21, 30, 45 e 60 dias sem venda', type: 'diário' },
    ],
  },
  {
    group: 'Comercial',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    alerts: [
      { key: 'lead_sem_movimentacao', label: 'Lead sem Movimentação', desc: 'Avisa nos marcos de 7, 15 e 30 dias sem agendamento, teste ou orçamento', type: 'diário' },
      { key: 'orcamento_sem_venda', label: 'Orçamento sem Venda', desc: 'Avisa aos 10, 20 e 30 dias após criação do orçamento sem venda', type: 'diário' },
      { key: 'cliente_pos_venda', label: 'Cliente entrou em Pós-Venda', desc: 'Avisa quando um cliente passa para o status pós-venda', type: 'evento' },
    ],
  },
  {
    group: 'Financeiro',
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    alerts: [
      { key: 'parcela_atrasada', label: 'Parcela em Atraso', desc: 'Avisa diariamente sobre parcelas de PIX Parcelado ou Cartão em atraso', type: 'diário' },
    ],
  },
  {
    group: 'Consertos',
    icon: Wrench,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    alerts: [
      { key: 'conserto_parado', label: 'Conserto sem Atualização', desc: 'Avisa nos marcos de 7, 15 e 30 dias sem alteração de status', type: 'diário' },
      { key: 'conserto_concluido', label: 'Conserto Concluído', desc: 'Avisa quando um conserto fica pronto para agendar a entrega ao cliente', type: 'evento' },
    ],
  },
  {
    group: 'Estoque & Garantia',
    icon: Package,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    alerts: [
      { key: 'estoque_baixo', label: 'Estoque Baixo', desc: 'Avisa quando um produto atinge o limite mínimo de estoque', type: 'evento' },
      { key: 'garantia_vencendo', label: 'Garantia Próxima do Vencimento', desc: 'Avisa 30 e 7 dias antes do vencimento da garantia do aparelho', type: 'diário' },
    ],
  },
];

const ALL_KEYS = ALERT_GROUPS.flatMap(g => g.alerts.map(a => a.key));

// ── Componente de Toggle de Alerta ────────────────────────────────────────────
function AlertRow({ alert, enabled, onToggle, saving }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{alert.label}</span>
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 ${alert.type === 'evento' ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}
          >
            {alert.type === 'evento' ? <Zap className="h-2.5 w-2.5 inline mr-0.5" /> : <Clock className="h-2.5 w-2.5 inline mr-0.5" />}
            {alert.type}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{alert.desc}</p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={saving}
        className="flex-shrink-0 mt-0.5 data-[state=checked]:bg-[#6B3FA0]"
      />
    </div>
  );
}

// ── Componente de Grupo de Alertas ────────────────────────────────────────────
function AlertGroup({ group, config, onToggle, saving }) {
  const Icon = group.icon;
  const groupAlerts = group.alerts;
  const enabledCount = groupAlerts.filter(a => config[a.key] !== false).length;
  const allEnabled = enabledCount === groupAlerts.length;
  const noneEnabled = enabledCount === 0;

  const handleToggleAll = () => {
    groupAlerts.forEach(a => onToggle(a.key, !allEnabled));
  };

  return (
    <Card className={`border ${group.border}`}>
      <CardHeader className={`pb-2 pt-4 px-5 ${group.bg} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`h-4 w-4 ${group.color}`} />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-800">{group.group}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{enabledCount}/{groupAlerts.length} ativos</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 text-slate-600 hover:text-slate-900"
              onClick={handleToggleAll}
              disabled={saving}
            >
              {allEnabled ? 'Desativar todos' : 'Ativar todos'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-0 divide-y divide-slate-100">
        {groupAlerts.map(alert => (
          <AlertRow
            key={alert.key}
            alert={alert}
            enabled={config[alert.key] !== false}
            onToggle={(val) => onToggle(alert.key, val)}
            saving={saving}
          />
        ))}
      </CardContent>
    </Card>
  );
}

const ALL_OPS = ['read', 'create', 'update', 'delete'];
const OP_LABELS = { read: 'Ler', create: 'Criar', update: 'Editar', delete: 'Excluir' };

// ── Editor de Permissões ──────────────────────────────────────────────────────
function PermissionsEditor() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState([]);

  useEffect(() => { loadPermissions(); }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('getAgentPermissions', {});
    setPermissions(res.data.tool_configs || []);
    setLoading(false);
  };

  const startEdit = () => {
    setDraft(permissions.map(p => ({ ...p, allowed_operations: [...p.allowed_operations] })));
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft([]); };

  const toggleOp = (entityName, op) => {
    setDraft(prev => prev.map(p => {
      if (p.entity_name !== entityName) return p;
      const ops = p.allowed_operations.includes(op)
        ? p.allowed_operations.filter(o => o !== op)
        : [...p.allowed_operations, op];
      return { ...p, allowed_operations: ops };
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    const tool_configs = draft.map(p => ({
      entity_name: p.entity_name,
      allowed_operations: p.allowed_operations,
    }));
    await base44.functions.invoke('saveAgentPermissions', { tool_configs });
    setPermissions(draft);
    setEditing(false);
    setSaving(false);
    toast.success('Permissões salvas com sucesso');
  };

  const displayList = editing ? draft : permissions;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 bg-slate-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <Shield className="h-4 w-4 text-[#6B3FA0]" />
              Permissões de Acesso
            </CardTitle>
            <CardDescription className="text-xs">Operações que o agente pode realizar em cada entidade</CardDescription>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={startEdit}>
              <Pencil className="h-3 w-3" /> Editar
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-500" onClick={cancelEdit} disabled={saving}>
                <X className="h-3 w-3" /> Cancelar
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1 bg-[#6B3FA0] hover:bg-[#5a3488]" onClick={savePermissions} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-xs">Carregando...</span>
          </div>
        ) : (
          <div className="space-y-0">
            {editing && (
              <div className="flex items-center justify-end gap-3 pb-2 mb-1 border-b border-slate-100">
                {ALL_OPS.map(op => (
                  <span key={op} className="text-xs font-medium text-slate-500 w-10 text-center">{OP_LABELS[op]}</span>
                ))}
              </div>
            )}
            {displayList.map(p => (
              <div key={p.entity_name} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 gap-2">
                <span className="text-xs font-medium text-slate-700 flex-1">{p.label || p.entity_name}</span>
                {editing ? (
                  <div className="flex items-center gap-3">
                    {ALL_OPS.map(op => (
                      <div key={op} className="w-10 flex justify-center">
                        <Checkbox
                          checked={p.allowed_operations.includes(op)}
                          onCheckedChange={() => toggleOp(p.entity_name, op)}
                          className="data-[state=checked]:bg-[#6B3FA0] data-[state=checked]:border-[#6B3FA0]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {p.allowed_operations.length === 0 ? (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 text-slate-400">Nenhuma</Badge>
                    ) : p.allowed_operations.map(op => (
                      <Badge key={op} variant="outline" className="text-xs px-1.5 py-0 text-[#6B3FA0] border-[#6B3FA0]/30 bg-[#6B3FA0]/5">
                        {OP_LABELS[op]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function AssistenteSonatta() {
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState(null);
  const whatsappURL = base44.agents.getWhatsAppConnectURL(AGENT_NAME);

  const totalAlertas = ALL_KEYS.length;
  const totalAtivos = ALL_KEYS.filter(k => config[k] !== false).length;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const settings = await base44.entities.AppSettings.filter({ setting_key: SETTINGS_KEY });
      if (settings.length > 0) {
        setSettingsId(settings[0].id);
        setConfig(settings[0].setting_value || {});
      } else {
        // Padrão: todos ativos
        const defaults = {};
        ALL_KEYS.forEach(k => { defaults[k] = true; });
        setConfig(defaults);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, { setting_value: newConfig });
      } else {
        const created = await base44.entities.AppSettings.create({
          setting_key: SETTINGS_KEY,
          setting_value: newConfig,
          description: 'Configuração de alertas do Assistente Sonatta',
        });
        setSettingsId(created.id);
      }
      toast.success(value ? 'Alerta ativado' : 'Alerta desativado');
    } catch (e) {
      // Reverte em caso de erro
      setConfig(config);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = async (enable) => {
    const newConfig = {};
    ALL_KEYS.forEach(k => { newConfig[k] = enable; });
    setConfig(newConfig);
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, { setting_value: newConfig });
      } else {
        const created = await base44.entities.AppSettings.create({
          setting_key: SETTINGS_KEY,
          setting_value: newConfig,
          description: 'Configuração de alertas do Assistente Sonatta',
        });
        setSettingsId(created.id);
      }
      toast.success(enable ? 'Todos os alertas ativados' : 'Todos os alertas desativados');
    } catch (e) {
      loadConfig();
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#6B3FA0] to-[#9B6FD0] flex items-center justify-center shadow-lg shadow-[#6B3FA0]/20">
          <Bot className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Assistente Sonatta</h1>
          <p className="text-sm text-slate-500">Agente de IA para consulta interna e alertas automáticos</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
        </Badge>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#6B3FA0]/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{totalAtivos}</p>
            <p className="text-xs text-slate-500">Alertas ativos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <BellOff className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{totalAlertas - totalAtivos}</p>
            <p className="text-xs text-slate-500">Alertas pausados</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">WhatsApp</p>
            <p className="text-xs text-slate-500">Canal conectado</p>
          </div>
        </div>
      </div>

      {/* Seção de Alertas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#6B3FA0]" />
              Alertas Automáticos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ative ou desative notificações enviadas pelo assistente via WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => handleToggleAll(false)}
              disabled={saving || loading}
            >
              <BellOff className="h-3.5 w-3.5 mr-1" /> Pausar todos
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 bg-[#6B3FA0] hover:bg-[#5a3488]"
              onClick={() => handleToggleAll(true)}
              disabled={saving || loading}
            >
              <Bell className="h-3.5 w-3.5 mr-1" /> Ativar todos
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando configurações...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {ALERT_GROUPS.map(group => (
              <AlertGroup
                key={group.group}
                group={group}
                config={config}
                onToggle={handleToggle}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* WhatsApp + Info em grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* WhatsApp */}
        <Card className="border-green-100">
          <CardHeader className="pb-3 bg-green-50 rounded-t-lg">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
              <MessageCircle className="h-4 w-4 text-green-600" />
              WhatsApp
            </CardTitle>
            <CardDescription className="text-xs">Consulte dados diretamente pelo WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-slate-600">Conecte o assistente para receber alertas e fazer consultas pelo WhatsApp.</p>
            <a href={whatsappURL} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                💬 Conectar ao WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Permissões */}
        <PermissionsEditor />
      </div>
    </div>
  );
}