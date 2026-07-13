import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { openWhatsApp } from '@/utils/whatsapp';
import ClientRowFunil, { AGE_GROUPS, PRIORITY } from '@/components/vendas/ClientRowFunil';
import BateriaTab from '@/components/vendas/BateriaTab';
import {
  Search, MessageSquare, TrendingDown, RefreshCw,
  Send, Users, Battery, TrendingUp, CheckCircle2
} from 'lucide-react';

// ─── Helpers de template ─────────────────────────────────────────────────────

function pickTemplate(templates, ageGroup, priority, messageType = 'padrao') {
  if (!templates || templates.length === 0) return null;
  const exact = templates.find(t =>
    (t.message_type || 'padrao') === messageType &&
    t.age_group === ageGroup &&
    t.priority === priority &&
    t.is_active
  );
  if (exact) return exact.message;
  const byGroup = templates.find(t =>
    (t.message_type || 'padrao') === messageType &&
    t.age_group === ageGroup &&
    t.is_active
  );
  if (byGroup) return byGroup.message;
  return null;
}

const FALLBACK_TEMPLATES = {
  bebes:    `Olá, {{nome}}! 👶\n\nAqui é a Sonatta. Gostaríamos de saber como está a jornada auditiva do(a) pequeno(a). Estamos à disposição!`,
  criancas: `Olá, {{nome}}! 🎒\n\nA Sonatta está em contato. Temos aparelhos perfeitos para crianças. Quando podemos conversar?`,
  adultos:  `Olá, {{nome}}! 😊\n\nA Sonatta está em contato. Nossos aparelhos são discretos e conectam ao celular. Que tal uma conversa sem compromisso?`,
};

function formatPhone(p) { return p?.replace(/\D/g, '') || ''; }

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function GroupCard({ groupKey, cfg, count, onCampaign }) {
  const Icon = cfg.icon;
  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-4`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.badge}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`text-3xl font-bold ${cfg.text}`}>{count}</span>
      </div>
      <div>
        <p className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{cfg.sublabel}</p>
      </div>
      <button
        disabled={count === 0}
        onClick={() => onCampaign(groupKey)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all
          ${count > 0
            ? `${cfg.badge} border ${cfg.border} hover:opacity-80 cursor-pointer`
            : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
          }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Campanha WhatsApp
      </button>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
        ${active
          ? 'bg-[#6B3FA0] text-white border-[#6B3FA0] shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-[#6B3FA0]/40 hover:text-[#6B3FA0]'
        }`}
    >
      {label}
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VendasPerdidas() {
  const [activeTab, setActiveTab]       = useState('funil');
  const [loading, setLoading]           = useState(true);
  const [data, setData]                 = useState({ lost_sales: [], stats: {} });
  const [templates, setTemplates]       = useState([]);
  const [activeGroup, setActiveGroup]   = useState('todos');
  const [activePrio, setActivePrio]     = useState('todos');
  const [search, setSearch]             = useState('');
  const [campaign, setCampaign]         = useState(null);
  const [campaignText, setCampaignText] = useState('');
  const [activeFunil, setActiveFunil]   = useState('todos');

  useEffect(() => { loadData(); loadTemplates(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getVendasPerdidas', {});
      setData(res.data || { lost_sales: [], stats: {} });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    try {
      const list = await base44.entities.MessageTemplate.filter({ is_active: true });
      setTemplates(list || []);
    } catch (e) { console.error(e); }
  };

  const filtered = (data.lost_sales || []).filter(item => {
    const g = activeGroup === 'todos' || item.age_group?.key === activeGroup;
    const p = activePrio  === 'todos' || item.priority === activePrio;
    const s = !search || item.client_name?.toLowerCase().includes(search.toLowerCase());
    const f = activeFunil === 'todos' || (item.funil_status || 'novo') === activeFunil;
    return g && p && s && f;
  });

  const stats = data.stats || {};

  const openCampaign = (groupKey) => {
    const clients = (data.lost_sales || []).filter(x => x.age_group?.key === groupKey);
    const tmplText = pickTemplate(templates, groupKey, 'alta')
      || FALLBACK_TEMPLATES[groupKey] || '';
    setCampaignText(tmplText);
    setCampaign({ groupKey, clients });
  };

  const sendToClient = (client) => {
    const phone = formatPhone(client.client_phone);
    if (!phone) return;
    const device = client.last_test_devices?.find(d => d.product_name)?.product_name || 'aparelho auditivo';
    const text = campaignText
      .replace(/{{nome}}/g, client.client_name?.split(' ')[0] || 'você')
      .replace(/{{aparelho}}/g, device);
    openWhatsApp(phone, text);
  };

  const sendDirect = async (item, messageType = 'padrao') => {
    const phone = formatPhone(item.client_phone);
    if (!phone) return;
    const tmpl = pickTemplate(templates, item.age_group?.key, item.priority, messageType)
      || FALLBACK_TEMPLATES[item.age_group?.key]
      || FALLBACK_TEMPLATES.adultos;
    const device = item.last_test_devices?.find(d => d.product_name)?.product_name || 'aparelho auditivo';
    const text = tmpl
      .replace(/{{nome}}/g, item.client_name?.split(' ')[0] || 'você')
      .replace(/{{aparelho}}/g, device);
    openWhatsApp(phone, text);
    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.entities.Client.update(item.client_id, {
        funil_status: 'tentativa_contato',
        funil_last_contact: today,
      });
      setData(prev => ({
        ...prev,
        lost_sales: (prev.lost_sales || []).map(c =>
          c.client_id === item.client_id
            ? { ...c, funil_status: 'tentativa_contato', funil_last_contact: today }
            : c
        )
      }));
    } catch (e) { console.error(e); }
  };

  const handleClientUpdated = (clientId, patch) => {
    setData(prev => ({
      ...prev,
      lost_sales: (prev.lost_sales || []).map(c =>
        c.client_id === clientId ? { ...c, ...patch } : c
      )
    }));
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Vendas Perdidas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Clientes que testaram mas não compraram — recupere essas oportunidades.
          </p>
        </div>
        {activeTab === 'funil' && (
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
          </Button>
        )}
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('funil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'funil' ? 'bg-white text-[#6B3FA0] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingDown className="h-4 w-4" />
          Funil de Recuperação
        </button>
        <button
          onClick={() => setActiveTab('baterias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'baterias' ? 'bg-white text-[#6B3FA0] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Battery className="h-4 w-4" />
          Gestão de Baterias
        </button>
      </div>

      {/* ── Aba Baterias ── */}
      {activeTab === 'baterias' && <BateriaTab />}

      {/* ── Aba Funil ── */}
      {activeTab === 'funil' && (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de oportunidades', value: stats.total,            bg: 'bg-white',    text: 'text-slate-800' },
              { label: 'Alta prioridade (≤7d)',  value: stats.alta_prioridade,  bg: 'bg-red-50',   text: 'text-red-600'   },
              { label: 'Média prioridade (≤30d)',value: stats.media_prioridade, bg: 'bg-amber-50', text: 'text-amber-600' },
              { label: 'Baixa prioridade (+30d)',value: stats.baixa_prioridade, bg: 'bg-slate-50', text: 'text-slate-500' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-2xl border border-slate-200 p-4 text-center`}>
                <p className={`text-3xl font-bold ${k.text}`}>{loading ? '…' : (k.value ?? 0)}</p>
                <p className="text-xs text-slate-400 mt-1 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {/* ── Dashboard de Performance ── */}
          {(() => {
            const all = data.lost_sales || [];
            const total = all.length;
            const recuperados = all.filter(c => (c.funil_status || 'novo') === 'agendado_novo_teste').length;
            const taxaRecuperacao = total > 0 ? Math.round((recuperados / total) * 100) : 0;

            const funilStages = [
              { key: 'novo',                 label: 'Novos',             color: 'bg-slate-400',   text: 'text-slate-600'  },
              { key: 'tentativa_contato',    label: 'Em contato',        color: 'bg-amber-400',   text: 'text-amber-600'  },
              { key: 'agendado_novo_teste',  label: 'Agendados',         color: 'bg-green-500',   text: 'text-green-600'  },
              { key: 'perdido_definitivo',   label: 'Perdidos definitivo',color: 'bg-red-400',    text: 'text-red-600'    },
            ];
            const stageCounts = {};
            funilStages.forEach(s => { stageCounts[s.key] = all.filter(c => (c.funil_status || 'novo') === s.key).length; });

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Taxa de Recuperação */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Taxa de Recuperação</p>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className={`text-4xl font-bold ${taxaRecuperacao > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                      {loading ? '…' : `${taxaRecuperacao}%`}
                    </span>
                    <span className="text-sm text-slate-400 mb-1">
                      {loading ? '' : `${recuperados} de ${total} agendados`}
                    </span>
                  </div>
                  {!loading && total > 0 && (
                    <div className="mt-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${taxaRecuperacao}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Clientes que chegaram à etapa "Agendado"</p>
                </div>

                {/* Funil de Vendas */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6B3FA0]/10 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-[#6B3FA0]" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Distribuição do Funil</p>
                  </div>
                  <div className="space-y-2.5">
                    {funilStages.map(stage => {
                      const count = loading ? 0 : stageCounts[stage.key];
                      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={stage.key} className="flex items-center gap-2">
                          <span className={`text-xs font-medium w-32 shrink-0 ${stage.text}`}>{stage.label}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${stage.color} rounded-full transition-all duration-500`} style={{ width: loading ? '0%' : `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-6 text-right shrink-0">{loading ? '…' : count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* Cards de Grupos + Campanhas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(AGE_GROUPS).map(([key, cfg]) => (
              <GroupCard
                key={key}
                groupKey={key}
                cfg={cfg}
                count={loading ? 0 : (stats[key] ?? 0)}
                onCampaign={openCampaign}
              />
            ))}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar cliente pelo nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium mr-1">Grupo:</span>
              <FilterPill label="Todos"             active={activeGroup === 'todos'}    onClick={() => setActiveGroup('todos')} />
              <FilterPill label="Bebês"             active={activeGroup === 'bebes'}    onClick={() => setActiveGroup('bebes')} />
              <FilterPill label="Crianças/Adolesc." active={activeGroup === 'criancas'} onClick={() => setActiveGroup('criancas')} />
              <FilterPill label="Adultos"           active={activeGroup === 'adultos'}  onClick={() => setActiveGroup('adultos')} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium mr-1">Prioridade:</span>
              <FilterPill label="Todas" active={activePrio === 'todos'} onClick={() => setActivePrio('todos')} />
              <FilterPill label="Alta"  active={activePrio === 'alta'}  onClick={() => setActivePrio('alta')} />
              <FilterPill label="Média" active={activePrio === 'media'} onClick={() => setActivePrio('media')} />
              <FilterPill label="Baixa" active={activePrio === 'baixa'} onClick={() => setActivePrio('baixa')} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium mr-1">Funil:</span>
              <FilterPill label="Todos"              active={activeFunil === 'todos'}               onClick={() => setActiveFunil('todos')} />
              <FilterPill label="Novo"               active={activeFunil === 'novo'}                onClick={() => setActiveFunil('novo')} />
              <FilterPill label="Em contato"         active={activeFunil === 'tentativa_contato'}   onClick={() => setActiveFunil('tentativa_contato')} />
              <FilterPill label="Agendado"           active={activeFunil === 'agendado_novo_teste'} onClick={() => setActiveFunil('agendado_novo_teste')} />
              <FilterPill label="Perdido definitivo" active={activeFunil === 'perdido_definitivo'}  onClick={() => setActiveFunil('perdido_definitivo')} />
            </div>
            <p className="text-xs text-slate-400">{filtered.length} cliente(s) encontrado(s)</p>
          </div>

          {/* Lista */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                <Users className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
                <p className="text-slate-400 text-sm mt-1">Ajuste os filtros ou aguarde novos testes finalizados.</p>
              </div>
            ) : (
              filtered.map(item => (
                <ClientRowFunil
                  key={item.client_id}
                  item={item}
                  onWhatsApp={sendDirect}
                  onUpdated={handleClientUpdated}
                />
              ))
            )}
          </div>

          {/* Modal de Campanha */}
          <Dialog open={!!campaign} onOpenChange={() => setCampaign(null)}>
            <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${campaign ? AGE_GROUPS[campaign.groupKey]?.badge : ''}`}>
                    {campaign && (() => { const Icon = AGE_GROUPS[campaign.groupKey]?.icon; return Icon ? <Icon className="h-4 w-4" /> : null; })()}
                  </div>
                  Campanha — {campaign ? AGE_GROUPS[campaign.groupKey]?.label : ''}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Mensagem da campanha</label>
                  <p className="text-xs text-slate-400">
                    Use <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">{'{{nome}}'}</code> para o primeiro nome do cliente.
                  </p>
                  <Textarea
                    value={campaignText}
                    onChange={e => setCampaignText(e.target.value)}
                    rows={7}
                    className="text-sm rounded-xl resize-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                  <span>{campaign?.clients?.length ?? 0} clientes neste grupo</span>
                  <span className="text-slate-400">Cada envio abre o WhatsApp individualmente</span>
                </div>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {(campaign?.clients || []).length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">Nenhum cliente neste grupo.</p>
                  ) : (
                    (campaign?.clients || []).map(client => {
                      const prio = PRIORITY[client.priority] || PRIORITY.baixa;
                      return (
                        <div key={client.client_id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{client.client_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">{client.client_phone || 'Sem telefone'}</span>
                              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${prio.color}`}>{prio.label}</span>
                            </div>
                          </div>
                          <button
                            disabled={!client.client_phone}
                            onClick={() => sendToClient(client)}
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Send className="h-3 w-3" />
                            Enviar
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      )}

    </div>
  );
}