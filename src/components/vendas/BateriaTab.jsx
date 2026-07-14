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

const DEFAULT_TEMPLATES = {
  menor: `Olá, {{nome}}! 👶\n\nAqui é da *Sonatta Soluções Auditivas*.\n\nNotamos que já faz um tempo desde a última compra de baterias/pilhas para o aparelho auditivo do(a) pequeno(a). Queremos garantir que o dispositivo continue funcionando perfeitamente! 🦻\n\nTemos baterias de alta qualidade disponíveis. Entre em contato ou passe aqui na clínica.\n\n_Sonatta Soluções Auditivas_`,
  maior: `Olá, {{nome}}! 😊\n\nAqui é da *Sonatta Soluções Auditivas*.\n\nNotamos que faz um tempo desde a sua última compra de baterias/pilhas, e queremos garantir que seu aparelho auditivo continue funcionando perfeitamente. 🦻✨\n\nTemos baterias de alta qualidade disponíveis para você! Entre em contato ou passe aqui na clínica.\n\n_Sonatta Soluções Auditivas_`,
};

function calcIdade(birthDate) {
  if (!birthDate) return null;
  const hoje = new Date();
  const nasc = new Date(birthDate);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export default function BateriaTab() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filtroEstagio, setFiltroEstagio] = useState('todos');
  const [bateriaTemplates, setBateriaTemplates] = useState({});

  const load = async () => {
    setLoading(true);
    const [res, tmpls] = await Promise.all([
      base44.functions.invoke('getBateriaClientes', {}),
      base44.entities.MessageTemplate.filter({ age_group: { $in: ['bateria_menor', 'bateria_maior'] } }),
    ]);
    setClientes(res.data.clientes || []);
    setStats(res.data.stats || {});
    const map = {};
    (tmpls || []).forEach(t => { map[t.age_group] = t.message; });
    setBateriaTemplates(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buildMessage = (cliente) => {
    const idade = calcIdade(cliente.birth_date);
    const grupoKey = (idade !== null && idade < 18) ? 'menor' : 'maior';
    const tmpl = bateriaTemplates[`bateria_${grupoKey}`] || DEFAULT_TEMPLATES[grupoKey];
    return tmpl.replace(/{{nome}}/g, cliente.client_name?.split(' ')[0] || cliente.client_name);
  };

  const sendWhatsAppCliente = (cliente) => {
    const phone = (cliente.client_phone || '').replace(/\D/g, '');
    if (!phone) { alert('Cliente sem telefone cadastrado'); return; }
    const phoneWithDDI = phone.startsWith('55') ? phone : `55${phone}`;
    openWhatsApp(phoneWithDDI, buildMessage(cliente));
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
              <p className="text-xs text-slate-500">Esgotados</p>
              <p className="text-2xl font-bold text-red-600">{stats.urgente || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500 opacity-70" />
            <div>
              <p className="text-xs text-slate-500">Atenção (&lt;15 dias restantes)</p>
              <p className="text-2xl font-bold text-amber-600">{stats.atencao || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-500 opacity-70" />
            <div>
              <p className="text-xs text-slate-500">OK (15+ dias restantes)</p>
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
              {e === 'todos' ? 'Todos' : e === 'urgente' ? '🔴 Esgotado' : e === 'atencao' ? '🟡 Atenção' : '🟢 OK'}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Info template */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
        <span>💬</span>
        <span>Os textos enviados variam por faixa etária (menores/maiores de 18 anos). Edite em <strong>Configurações → 🔋 WhatsApp Baterias</strong>.</span>
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
                        {cliente.dias_restantes > 0
                          ? <>Termina em <strong className="text-amber-600">{cliente.dias_restantes} dia{cliente.dias_restantes !== 1 ? 's' : ''}</strong> · {new Date(cliente.data_termino_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}</>
                          : <><strong className="text-red-600">Esgotado há {Math.abs(cliente.dias_restantes)} dia{Math.abs(cliente.dias_restantes) !== 1 ? 's' : ''}</strong></>
                        }
                        {' · '}{cliente.uso_aparelhos === 'bilateral' ? '🦻🦻 Par' : '🦻 Unilateral'}
                        {' · '}{cliente.cartelas_ultima_compra} cartela{cliente.cartelas_ultima_compra !== 1 ? 's' : ''} comprada{cliente.cartelas_ultima_compra !== 1 ? 's' : ''}
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