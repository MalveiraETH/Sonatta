import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { openWhatsApp } from '@/utils/whatsapp';
import { Search, MessageCircle, RefreshCw, Battery, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const ESTAGIO_CONFIG = {
  urgente:  { label: 'Urgente',  bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertTriangle, border: 'border-red-200' },
  atencao:  { label: 'Atenção',  bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock,         border: 'border-amber-200' },
  recente:  { label: 'Recente',  bg: 'bg-emerald-100',text: 'text-emerald-700',icon: CheckCircle,   border: 'border-emerald-200' },
};

const DEFAULT_TEMPLATE = `Olá {{nome}}! 😊

Tudo bem? Aqui é da *Sonatta Soluções Auditivas*.

Notamos que faz um tempo desde a sua última compra de baterias, e queremos garantir que seu aparelho auditivo continue funcionando perfeitamente. 🦻✨

Temos baterias de alta qualidade disponíveis para você! Entre em contato ou passe aqui na clínica.

_Sonatta Soluções Auditivas_`;

export default function BateriaTab() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filtroEstagio, setFiltroEstagio] = useState('todos');
  const [ciclo, setCiclo] = useState(90);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplate, setShowTemplate] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('getBateriaClientes', { ciclo_dias: ciclo });
    setClientes(res.data.clientes || []);
    setStats(res.data.stats || {});
    setLoading(false);
  };

  useEffect(() => { load(); }, [ciclo]);

  const buildMessage = (cliente) =>
    template.replace(/{{nome}}/g, cliente.client_name?.split(' ')[0] || cliente.client_name);

  const sendWhatsAppCliente = (cliente) => {
    const phone = (cliente.client_phone || '').replace(/\D/g, '');
    if (!phone) { alert('Cliente sem telefone cadastrado'); return; }
    openWhatsApp(`55${phone}`, buildMessage(cliente));
  };

  const filtered = clientes.filter(c => {
    const matchSearch = !search || c.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchEstagio = filtroEstagio === 'todos' || c.estagio === filtroEstagio;
    return matchSearch && matchEstagio;
  });

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Battery className="h-8 w-8 text-[#6B3FA0] opacity-70" />
            <div>
              <p className="text-xs text-slate-500">Total Clientes</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500 opacity-70" />
            <div>
              <p className="text-xs text-slate-500">Urgente ({ciclo}+ dias)</p>
              <p className="text-2xl font-bold text-red-600">{stats.urgente || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500 opacity-70" />
            <div>
              <p className="text-xs text-slate-500">Atenção (60–90 dias)</p>
              <p className="text-2xl font-bold text-amber-600">{stats.atencao || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-500 opacity-70" />
            <div>
              <p className="text-xs text-slate-500">Recentes (&lt;60 dias)</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.recente || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', 'urgente', 'atencao', 'recente'].map(e => (
            <button
              key={e}
              onClick={() => setFiltroEstagio(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filtroEstagio === e
                  ? 'bg-[#6B3FA0] text-white border-[#6B3FA0]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#6B3FA0]'
              }`}
            >
              {e === 'todos' ? 'Todos' : e === 'urgente' ? '🔴 Urgente' : e === 'atencao' ? '🟡 Atenção' : '🟢 Recente'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Ciclo (dias):</span>
          <Input
            type="number"
            value={ciclo}
            onChange={e => setCiclo(Number(e.target.value))}
            className="w-20 text-center"
            min={1}
          />
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Template de mensagem */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
        >
          <span>✉️ Template de mensagem WhatsApp</span>
          <span className="text-slate-400">{showTemplate ? '▲' : '▼'}</span>
        </button>
        {showTemplate && (
          <div className="p-4 bg-white">
            <p className="text-xs text-slate-500 mb-2">Use <code className="bg-slate-100 px-1 rounded">{'{{nome}}'}</code> para o primeiro nome do cliente.</p>
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={8}
              className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#6B3FA0]/30"
            />
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">
          <Battery className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum cliente encontrado</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(cliente => {
            const cfg = ESTAGIO_CONFIG[cliente.estagio];
            const Icon = cfg.icon;
            return (
              <Card key={cliente.client_id} className={`p-4 border ${cfg.border}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{cliente.client_name}</p>
                      <p className="text-xs text-slate-500">
                        Última compra: <strong>{cliente.dias_desde_compra} dias atrás</strong>
                        {' · '}{cliente.total_compras}x compra{cliente.total_compras !== 1 ? 's' : ''}
                        {' · '}{cliente.total_baterias} bateria{cliente.total_baterias !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendWhatsAppCliente(cliente)}
                    disabled={!cliente.client_phone}
                    className="flex-shrink-0 bg-[#25D366] hover:bg-[#1fb558] text-white gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-center text-slate-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}