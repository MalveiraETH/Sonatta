import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { openWhatsApp } from '@/utils/whatsapp';
import {
  Baby, GraduationCap, UserCheck, AlertTriangle,
  Clock, Search, MessageSquare, TrendingDown, RefreshCw,
  Phone, ChevronDown, ChevronUp, Send, Users, Stethoscope
} from 'lucide-react';

// ─── Configurações ────────────────────────────────────────────────────────────

const AGE_GROUPS = {
  bebes:    { label: 'Bebês',                sublabel: '0 a 1 ano',   icon: Baby,          bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   badge: 'bg-pink-100 text-pink-700',   dot: 'bg-pink-400'   },
  criancas: { label: 'Crianças/Adolesc.',    sublabel: '1 a 15 anos', icon: GraduationCap, bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-400'},
  adultos:  { label: 'Adultos',             sublabel: '+15 anos',    icon: UserCheck,     bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400'   },
};

const PRIORITY = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700',      dot: 'bg-red-400',    icon: AlertTriangle },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400',  icon: Clock         },
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-300',  icon: TrendingDown  },
};

const DEFAULT_TEMPLATES = {
  bebes: `Olá, {{nome}}! 👶\n\nAqui é a Sonatta – Aparelhos Auditivos. Percebemos que realizaram um teste conosco e queríamos saber como está indo a jornada auditiva do pequeno(a).\n\nTemos soluções especializadas para bebês, com tecnologia de ponta e suporte fonoaudiológico completo. A audição nos primeiros meses é fundamental para o desenvolvimento da linguagem. 💙\n\nPodemos conversar? Estamos à disposição!`,
  criancas: `Olá, {{nome}}! 🎒\n\nA Sonatta tem novidades! Seu(sua) filho(a) realizou um teste conosco e gostaríamos de saber se surgiu alguma dúvida.\n\nTemos aparelhos discretos e resistentes, perfeitos para a rotina escolar. Crianças com boa audição têm melhor desempenho e desenvolvimento social. 🌟\n\nQuando podemos conversar?`,
  adultos: `Olá, {{nome}}! 😊\n\nA Sonatta está em contato para saber como você está. Você realizou um teste conosco e ficamos na torcida pela sua experiência.\n\nNossos aparelhos são discretos, conectam ao celular via Bluetooth e se adaptam ao seu estilo de vida. 🎧\n\nQue tal agendar uma conversa sem compromisso?`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(p) { return p?.replace(/\D/g, '') || ''; }

function daysLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'hoje';
  if (days === 1) return '1 dia atrás';
  return `${days} dias atrás`;
}

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

function ClientRow({ item, onWhatsApp }) {
  const [expanded, setExpanded] = useState(false);
  const group = AGE_GROUPS[item.age_group?.key] || AGE_GROUPS.adultos;
  const prio  = PRIORITY[item.priority]         || PRIORITY.baixa;
  const PrioIcon = prio.icon;
  const GroupIcon = group.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition-colors">
      {/* Row principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar / grupo */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${group.badge}`}>
          <GroupIcon className="h-4 w-4" />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm leading-tight">{item.client_name}</p>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${group.badge}`}>{group.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${prio.color}`}>
              <PrioIcon className="h-3 w-3" />
              {prio.label}
            </span>
            <span className="text-xs text-slate-400">
              Teste finalizado {daysLabel(item.days_since_test)}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.client_phone && (
            <button
              onClick={() => onWhatsApp(item)}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Telefone</p>
              <p className="text-slate-700 font-medium">{item.client_phone || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Profissional</p>
              <p className="text-slate-700 font-medium">{item.responsible_professional || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Data do teste</p>
              <p className="text-slate-700 font-medium">
                {item.last_test_end_date
                  ? new Date(item.last_test_end_date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>

          {item.last_test_devices?.filter(d => d.product_name)?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Aparelhos testados</p>
              <div className="flex flex-wrap gap-1.5">
                {item.last_test_devices.filter(d => d.product_name).map((d, i) => (
                  <span key={i} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 font-medium flex items-center gap-1">
                    <Stethoscope className="h-3 w-3 text-slate-400" />
                    {d.product_name}
                    {d.serial_number && <span className="text-slate-300">· {d.serial_number}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onWhatsApp(item)}
            disabled={!item.client_phone}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar mensagem personalizada
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VendasPerdidas() {
  const [loading, setLoading]         = useState(true);
  const [data, setData]               = useState({ lost_sales: [], stats: {} });
  const [activeGroup, setActiveGroup] = useState('todos');
  const [activePrio, setActivePrio]   = useState('todos');
  const [search, setSearch]           = useState('');
  const [campaign, setCampaign]       = useState(null); // { groupKey, clients }
  const [campaignText, setCampaignText] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getVendasPerdidas', {});
      setData(res.data || { lost_sales: [], stats: {} });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = (data.lost_sales || []).filter(item => {
    const g = activeGroup === 'todos' || item.age_group?.key === activeGroup;
    const p = activePrio  === 'todos' || item.priority === activePrio;
    const s = !search || item.client_name?.toLowerCase().includes(search.toLowerCase());
    return g && p && s;
  });

  const stats = data.stats || {};

  const openCampaign = (groupKey) => {
    const clients = (data.lost_sales || []).filter(x => x.age_group?.key === groupKey);
    setCampaignText(DEFAULT_TEMPLATES[groupKey] || '');
    setCampaign({ groupKey, clients });
  };

  const sendToClient = (client) => {
    const phone = formatPhone(client.client_phone);
    if (!phone) return;
    const text = campaignText.replace(/{{nome}}/g, client.client_name?.split(' ')[0] || 'você');
    openWhatsApp(phone, text);
  };

  const sendDirect = (item) => {
    const phone = formatPhone(item.client_phone);
    if (!phone) return;
    const tmpl = DEFAULT_TEMPLATES[item.age_group?.key] || DEFAULT_TEMPLATES.adultos;
    const text = tmpl.replace(/{{nome}}/g, item.client_name?.split(' ')[0] || 'você');
    openWhatsApp(phone, text);
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
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
        </Button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de oportunidades', value: stats.total,            bg: 'bg-white',        text: 'text-slate-800' },
          { label: 'Alta prioridade (≤7d)',  value: stats.alta_prioridade,  bg: 'bg-red-50',       text: 'text-red-600'   },
          { label: 'Média prioridade (≤30d)',value: stats.media_prioridade, bg: 'bg-amber-50',     text: 'text-amber-600' },
          { label: 'Baixa prioridade (+30d)',value: stats.baixa_prioridade, bg: 'bg-slate-50',     text: 'text-slate-500' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl border border-slate-200 p-4 text-center`}>
            <p className={`text-3xl font-bold ${k.text}`}>{loading ? '…' : (k.value ?? 0)}</p>
            <p className="text-xs text-slate-400 mt-1 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Cards de Grupos + Campanhas ── */}
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

      {/* ── Filtros ── */}
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
          <FilterPill label="Todos"              active={activeGroup === 'todos'}    onClick={() => setActiveGroup('todos')} />
          <FilterPill label="Bebês"              active={activeGroup === 'bebes'}    onClick={() => setActiveGroup('bebes')} />
          <FilterPill label="Crianças/Adolesc."  active={activeGroup === 'criancas'} onClick={() => setActiveGroup('criancas')} />
          <FilterPill label="Adultos"            active={activeGroup === 'adultos'}  onClick={() => setActiveGroup('adultos')} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">Prioridade:</span>
          <FilterPill label="Todas"  active={activePrio === 'todos'} onClick={() => setActivePrio('todos')} />
          <FilterPill label="Alta"   active={activePrio === 'alta'}  onClick={() => setActivePrio('alta')} />
          <FilterPill label="Média"  active={activePrio === 'media'} onClick={() => setActivePrio('media')} />
          <FilterPill label="Baixa"  active={activePrio === 'baixa'} onClick={() => setActivePrio('baixa')} />
        </div>
        <p className="text-xs text-slate-400">{filtered.length} cliente(s) encontrado(s)</p>
      </div>

      {/* ── Lista ── */}
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
            <ClientRow key={item.client_id} item={item} onWhatsApp={sendDirect} />
          ))
        )}
      </div>

      {/* ── Modal de Campanha ── */}
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
            {/* Editor de mensagem */}
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

            {/* Preview da contagem */}
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
              <span>{campaign?.clients?.length ?? 0} clientes neste grupo</span>
              <span className="text-slate-400">Cada envio abre o WhatsApp individualmente</span>
            </div>

            {/* Lista de clientes */}
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
  );
}