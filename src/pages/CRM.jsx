import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Users, TrendingUp, AlertTriangle, Trophy } from 'lucide-react';
import CrmColumn from '@/components/crm/CrmColumn';
import LossReasonDialog from '@/components/crm/LossReasonDialog';

const COLUMNS = [
  {
    id: 'lead',
    label: 'Novos Leads',
    icon: '🎯',
    headerBg: 'bg-slate-700',
    headerText: 'text-white',
    badgeBg: 'bg-slate-500',
    badgeText: 'text-white',
  },
  {
    id: 'agendamento_pendente',
    label: 'Agendamento Pendente',
    icon: '📞',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    badgeBg: 'bg-amber-700',
    badgeText: 'text-white',
  },
  {
    id: 'teste_agendado',
    label: 'Teste Agendado',
    icon: '📅',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    badgeBg: 'bg-purple-800',
    badgeText: 'text-white',
  },
  {
    id: 'em_teste',
    label: 'Em Teste 🔥',
    icon: '👂',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    badgeBg: 'bg-blue-800',
    badgeText: 'text-white',
  },
  {
    id: 'teste_estendido',
    label: 'Teste Estendido',
    icon: '⏳',
    headerBg: 'bg-indigo-500',
    headerText: 'text-white',
    badgeBg: 'bg-indigo-700',
    badgeText: 'text-white',
  },
  {
    id: 'teste_finalizado',
    label: 'Em Fechamento',
    icon: '🤝',
    headerBg: 'bg-teal-600',
    headerText: 'text-white',
    badgeBg: 'bg-teal-800',
    badgeText: 'text-white',
  },
  {
    id: 'aguardando_faturamento',
    label: 'Aguardando Fat.',
    icon: '💳',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    badgeBg: 'bg-orange-700',
    badgeText: 'text-white',
  },
  {
    id: 'cliente_ativo',
    label: 'Clientes Ativos',
    icon: '✅',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    badgeBg: 'bg-emerald-800',
    badgeText: 'text-white',
  },
  {
    id: 'pos_venda',
    label: 'Pós-Venda',
    icon: '⭐',
    headerBg: 'bg-pink-500',
    headerText: 'text-white',
    badgeBg: 'bg-pink-700',
    badgeText: 'text-white',
  },
  {
    id: 'perdido',
    label: 'Perdidos',
    icon: '❌',
    headerBg: 'bg-red-500',
    headerText: 'text-white',
    badgeBg: 'bg-red-700',
    badgeText: 'text-white',
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
}

export default function CRM() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [professionalFilter, setProfessionalFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await base44.entities.Client.list('-updated_date', 500);
    setClients(data);
    setLoading(false);
  };

  const professionals = [...new Set(clients.map(c => c.responsible_professional).filter(Boolean))];

  const filteredClients = clients.filter(c => {
    const matchSearch = !searchTerm || c.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPro = professionalFilter === 'all' || c.responsible_professional === professionalFilter;
    const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    return matchSearch && matchPro && matchPriority;
  });

  const getColumnClients = (columnId) => filteredClients.filter(c => c.status === columnId);

  // Summary stats
  const totalPipeline = clients
    .filter(c => !['cliente_ativo', 'pos_venda', 'perdido'].includes(c.status))
    .reduce((sum, c) => sum + (c.estimated_value || 0), 0);
  const stagnated = clients.filter(c => {
    const ref = c.last_contact_date || c.updated_date || c.created_date;
    if (!ref) return false;
    const days = Math.floor((new Date() - new Date(ref)) / 86400000);
    return days >= 7 && !['cliente_ativo', 'pos_venda', 'perdido'].includes(c.status);
  }).length;
  const activeTests = clients.filter(c => ['em_teste', 'teste_estendido'].includes(c.status)).length;
  const wonThisMonth = clients.filter(c => {
    if (c.status !== 'cliente_ativo') return false;
    const updated = new Date(c.updated_date || c.created_date);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  }).length;

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;

    if (newStatus === 'perdido') {
      setPendingMove({ clientId: draggableId, newStatus });
      setLossDialogOpen(true);
      return;
    }

    await applyMove(draggableId, newStatus, {});
  };

  const applyMove = async (clientId, newStatus, extraData) => {
    // Optimistic update
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, status: newStatus, ...extraData } : c
    ));
    await base44.entities.Client.update(clientId, {
      status: newStatus,
      last_contact_date: new Date().toISOString().split('T')[0],
      ...extraData,
    });
    toast.success('Status atualizado!');
  };

  const handleLossConfirm = async (lossData) => {
    if (!pendingMove) return;
    setLossDialogOpen(false);
    await applyMove(pendingMove.clientId, 'perdido', lossData);
    setPendingMove(null);
  };

  const handleLossCancel = () => {
    setLossDialogOpen(false);
    setPendingMove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM — Funil de Vendas</h1>
          <p className="text-sm text-slate-500">{clients.length} clientes no funil</p>
        </div>
        <Button variant="outline" onClick={loadClients} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="bg-[#6B3FA0]/10 rounded-lg p-2">
            <TrendingUp className="h-5 w-5 text-[#6B3FA0]" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Pipeline Total</p>
            <p className="font-bold text-slate-900 text-sm">{formatCurrency(totalPipeline)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="bg-blue-50 rounded-lg p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Em Teste</p>
            <p className="font-bold text-blue-600 text-sm">{activeTests} clientes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="bg-red-50 rounded-lg p-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Estagnados (+7d)</p>
            <p className="font-bold text-red-500 text-sm">{stagnated} clientes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="bg-emerald-50 rounded-lg p-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Fechados no Mês</p>
            <p className="font-bold text-emerald-600 text-sm">{wonThisMonth} clientes</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {professionals.length > 0 && (
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="urgente">🔴 Urgente</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="media">🔵 Média</SelectItem>
            <SelectItem value="baixa">⚪ Baixa</SelectItem>
          </SelectContent>
        </Select>

        {(searchTerm || professionalFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchTerm(''); setProfessionalFilter('all'); setPriorityFilter('all'); }}
            className="text-slate-500"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 272}px` }}>
            {COLUMNS.map(column => (
              <CrmColumn
                key={column.id}
                column={column}
                clients={getColumnClients(column.id)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"></span> Borda vermelha = +7 dias sem contato</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span> Prioridade Urgente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Prioridade Alta</span>
        <span className="flex items-center gap-1">💰 Valor estimado da venda</span>
        <span className="flex items-center gap-1">💬 Clique no ícone para WhatsApp direto</span>
      </div>

      <LossReasonDialog
        open={lossDialogOpen}
        onConfirm={handleLossConfirm}
        onCancel={handleLossCancel}
      />
    </div>
  );
}