import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { openWhatsApp } from '@/utils/whatsapp';
import {
  Users, Baby, GraduationCap, UserCheck, AlertTriangle,
  Clock, Search, MessageSquare, TrendingDown, RefreshCw,
  Phone, ChevronDown, ChevronUp, Send
} from 'lucide-react';

const AGE_GROUPS = {
  bebes:    { label: 'Bebês',               sublabel: '0 a 1 ano',       icon: Baby,           color: 'bg-pink-100 text-pink-700 border-pink-200',   badgeColor: 'bg-pink-100 text-pink-700' },
  criancas: { label: 'Crianças/Adolescentes', sublabel: '1 a 15 anos',  icon: GraduationCap,  color: 'bg-green-100 text-green-700 border-green-200', badgeColor: 'bg-green-100 text-green-700' },
  adultos:  { label: 'Adultos',             sublabel: '+15 anos',        icon: UserCheck,      color: 'bg-blue-100 text-blue-700 border-blue-200',   badgeColor: 'bg-blue-100 text-blue-700' },
};

const PRIORITY_CONFIG = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700',    icon: AlertTriangle },
  media: { label: 'Média', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-600', icon: TrendingDown },
};

const DEFAULT_TEMPLATES = {
  bebes: `Olá, {{nome}}! 👶

Aqui é da Sonatta – Aparelhos Auditivos. Percebemos que o {{nome}} realizou um teste conosco e queríamos saber como está sendo a jornada auditiva.

Temos soluções especializadas para bebês, com tecnologia de ponta e suporte fonoaudiológico completo. A audição nos primeiros meses é fundamental para o desenvolvimento da linguagem. 💙

Podemos agendar uma conversa? Estamos à disposição!`,

  criancas: `Olá, {{nome}}! 🎒

A Sonatta tem novidades para você! Seu(sua) filho(a) realizou um teste de aparelho auditivo conosco e gostaríamos de saber se surgiu alguma dúvida.

Temos aparelhos discretos e resistentes, perfeitos para a rotina escolar e esportiva. Crianças com boa audição têm melhor desempenho e desenvolvimento social. 🌟

Quando podemos conversar?`,

  adultos: `Olá, {{nome}}! 

A Sonatta – Aparelhos Auditivos está em contato para saber como você está. Você realizou um teste conosco e ficamos na torcida para que a experiência tenha sido positiva.

A tecnologia dos nossos aparelhos evoluiu muito: são discretos, conectam ao celular via Bluetooth e se adaptam ao seu estilo de vida. 🎧

Que tal agendar uma conversa sem compromisso? Nossos especialistas estão aqui para te ajudar!`,
};

function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function daysSinceLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'Hoje';
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

export default function VendasPerdidas() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ lost_sales: [], stats: {} });
  const [activeGroup, setActiveGroup] = useState('todos');
  const [activePriority, setActivePriority] = useState('todos');
  const [search, setSearch] = useState('');
  const [campaignModal, setCampaignModal] = useState(null); // { group_key, clients }
  const [campaignText, setCampaignText] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getVendasPerdidas', {});
      setData(res.data || { lost_sales: [], stats: {} });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = (data.lost_sales || []).filter(item => {
    const matchGroup = activeGroup === 'todos' || item.age_group?.key === activeGroup;
    const matchPriority = activePriority === 'todos' || item.priority === activePriority;
    const matchSearch = !search || item.client_name?.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchPriority && matchSearch;
  });

  const openCampaign = (groupKey) => {
    const clients = (data.lost_sales || []).filter(x => x.age_group?.key === groupKey);
    setCampaignText(DEFAULT_TEMPLATES[groupKey] || '');
    setCampaignModal({ group_key: groupKey, clients });
  };

  const sendWhatsApp = (client) => {
    const phone = formatPhone(client.client_phone);
    if (!phone) return alert('Cliente sem telefone cadastrado.');
    const text = campaignText.replace(/{{nome}}/g, client.client_name?.split(' ')[0] || 'você');
    openWhatsApp(phone, text);
  };

  const stats = data.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Vendas Perdidas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Clientes que testaram mas não compraram — recupere essas oportunidades.</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="self-start sm:self-auto">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-slate-800">{stats.total ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Total de oportunidades</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{stats.alta_prioridade ?? '—'}</p>
          <p className="text-xs text-red-500 mt-1">Alta prioridade (≤7 dias)</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.media_prioridade ?? '—'}</p>
          <p className="text-xs text-yellow-500 mt-1">Média prioridade (≤30 dias)</p>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-slate-500">{stats.baixa_prioridade ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Baixa prioridade (+30 dias)</p>
        </div>
      </div>

      {/* Grupos por faixa etária */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(AGE_GROUPS).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = stats[key] ?? 0;
          return (
            <div key={key} className={`rounded-xl border p-4 ${cfg.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">{cfg.label}</p>
                    <p className="text-xs opacity-70">{cfg.sublabel}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full text-xs border-current"
                onClick={() => openCampaign(key)}
                disabled={count === 0}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Campanha WhatsApp
              </Button>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'bebes', 'criancas', 'adultos'].map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeGroup === g
                    ? 'bg-[#6B3FA0] text-white border-[#6B3FA0]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#6B3FA0]/50'
                }`}
              >
                {g === 'todos' ? 'Todos' : AGE_GROUPS[g]?.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'alta', 'media', 'baixa'].map(p => (
              <button
                key={p}
                onClick={() => setActivePriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activePriority === p
                    ? 'bg-[#6B3FA0] text-white border-[#6B3FA0]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#6B3FA0]/50'
                }`}
              >
                {p === 'todos' ? 'Todas prioridades' : PRIORITY_CONFIG[p]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            <TrendingDown className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Nenhuma venda perdida encontrada</p>
            <p className="text-sm mt-1">Todos os clientes com teste finalizado realizaram uma compra! 🎉</p>
          </div>
        ) : (
          filtered.map(item => {
            const group = AGE_GROUPS[item.age_group?.key] || AGE_GROUPS.adultos;
            const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.baixa;
            const PriorityIcon = priority.icon;
            const GroupIcon = group.icon;
            const isExpanded = expandedClient === item.client_id;

            return (
              <div key={item.client_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedClient(isExpanded ? null : item.client_id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${group.badgeColor}`}>
                    <GroupIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 text-sm">{item.client_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.badgeColor}`}>
                        {group.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${priority.color}`}>
                        <PriorityIcon className="h-3 w-3" />
                        {priority.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Último teste: {daysSinceLabel(item.days_since_test)} atrás
                      {item.last_test_end_date && ` · ${new Date(item.last_test_end_date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.client_phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 hidden sm:flex"
                        onClick={e => {
                          e.stopPropagation();
                          const phone = formatPhone(item.client_phone);
                          openWhatsApp(phone);
                        }}
                      >
                        <Phone className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Telefone</p>
                        <p className="text-slate-700">{item.client_phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Profissional Responsável</p>
                        <p className="text-slate-700">{item.responsible_professional || '—'}</p>
                      </div>
                      {item.last_test_devices?.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Aparelhos testados</p>
                          <div className="flex flex-wrap gap-1">
                            {item.last_test_devices.map((d, i) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                                {d.product_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      {item.client_phone && (
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => {
                            const phone = formatPhone(item.client_phone);
                            const text = DEFAULT_TEMPLATES[item.age_group?.key]?.replace(/{{nome}}/g, item.client_name?.split(' ')[0] || 'você') || '';
                            openWhatsApp(phone, text);
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" /> Enviar mensagem padrão
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Campanha por Grupo */}
      {campaignModal && (
        <Dialog open={!!campaignModal} onOpenChange={() => setCampaignModal(null)}>
          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Campanha — {AGE_GROUPS[campaignModal.group_key]?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">
                  Use <code className="bg-slate-100 px-1 rounded text-xs">{'{{nome}}'}</code> para personalizar com o primeiro nome do cliente.
                </p>
                <Textarea
                  value={campaignText}
                  onChange={e => setCampaignText(e.target.value)}
                  rows={8}
                  className="text-sm"
                  placeholder="Digite o texto da campanha..."
                />
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {campaignModal.clients.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-6">Nenhum cliente neste grupo.</p>
                ) : (
                  campaignModal.clients.map(client => (
                    <div key={client.client_id} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{client.client_name}</p>
                        <p className="text-xs text-slate-400">{client.client_phone || 'Sem telefone'}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={!client.client_phone}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs"
                        onClick={() => sendWhatsApp(client)}
                      >
                        <Send className="h-3 w-3 mr-1" /> Enviar
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Cada clique em "Enviar" abrirá o WhatsApp com a mensagem personalizada para aquele cliente.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}