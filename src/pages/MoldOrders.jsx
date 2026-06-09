import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import MoldOrderForm from '@/components/molds/MoldOrderForm';
import MoldStatusBadge from '@/components/molds/MoldStatusBadge';
import {
  Plus, Search, MessageCircle, Pencil, Layers, Package,
  Clock, CheckCircle2, Truck, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openWhatsApp } from '@/utils/whatsapp';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'impressao_coletada', label: 'Impressão Coletada' },
  { value: 'enviado_ao_fornecedor', label: 'Enviado ao Fornecedor' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'entregue_ao_cliente', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PRODUCT_LABELS = {
  molde: 'Molde',
  tampao_silicone: 'Tampão de Silicone',
  molde_e_tampao: 'Molde + Tampão',
};

const EAR_LABELS = {
  direito: 'Direita',
  esquerdo: 'Esquerda',
  bilateral: 'Bilateral',
};

export default function MoldOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.MoldOrder.list('-created_date', 200);
    setOrders(data);
    setLoading(false);
  };

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const term = search.toLowerCase();
    const matchSearch = !term ||
      o.client_name?.toLowerCase().includes(term) ||
      o.order_number?.toLowerCase().includes(term) ||
      o.supplier_name?.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: orders.length,
    em_andamento: orders.filter(o => ['impressao_coletada', 'enviado_ao_fornecedor', 'em_producao'].includes(o.status)).length,
    recebido: orders.filter(o => o.status === 'recebido').length,
    entregue: orders.filter(o => o.status === 'entregue_ao_cliente').length,
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingOrder(null);
    setFormOpen(true);
  };

  const handleWhatsApp = (order) => {
    if (!order.client_phone) { toast.error('Cliente sem telefone'); return; }
    const phone = order.client_phone.replace(/\D/g, '');
    const productLabel = PRODUCT_LABELS[order.product_type] || 'produto';
    const msg = `Olá ${order.client_name}! Seu(sua) *${productLabel}* chegou e está pronto para retirada. Entre em contato para agendar. 😊`;
    openWhatsApp(`55${phone}`, msg);

    // Marcar WhatsApp como enviado
    base44.entities.MoldOrder.update(order.id, { whatsapp_sent: true });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, whatsapp_sent: true } : o));
  };

  const handleMarkReceived = async (order) => {
    await base44.entities.MoldOrder.update(order.id, {
      status: 'recebido',
      date_received: new Date().toISOString().split('T')[0]
    });
    toast.success('Marcado como recebido!');
    loadData();
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return format(new Date(d + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR });
  };

  const fmtCurrency = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#6B3FA0]" />
            Moldes & Tampões
          </h1>
          <p className="text-sm text-slate-500 mt-1">Controle de confecção e recebimento sob demanda</p>
        </div>
        <Button onClick={handleNew} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
          <Plus className="h-4 w-4 mr-2" />
          Nova Ordem
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('em_producao')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.em_andamento}</p>
              <p className="text-xs text-slate-500">Em Andamento</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('recebido')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{stats.recebido}</p>
              <p className="text-xs text-slate-500">Recebidos (aguard. entrega)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('entregue_ao_cliente')}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700">{stats.entregue}</p>
              <p className="text-xs text-slate-500">Entregues</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerta: recebidos aguardando notificação */}
      {orders.filter(o => o.status === 'recebido' && !o.whatsapp_sent).length > 0 && (
        <Card className="border-emerald-300 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {orders.filter(o => o.status === 'recebido' && !o.whatsapp_sent).length} pedido(s) recebido(s) aguardando notificação ao cliente
              </p>
              <p className="text-xs text-emerald-600">Clique no ícone de WhatsApp na tabela para notificar</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, ordem ou fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela Desktop */}
      <Card className="hidden lg:block">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Ordem</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Orelha</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Impressão</TableHead>
                <TableHead>Recebimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">Nenhuma ordem encontrada</TableCell>
                </TableRow>
              ) : (
                filtered.map(order => (
                  <TableRow key={order.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs font-semibold text-[#6B3FA0]">{order.order_number}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{order.client_name}</p>
                      <p className="text-xs text-slate-400">{order.client_phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">{PRODUCT_LABELS[order.product_type]}</TableCell>
                    <TableCell className="text-sm">{EAR_LABELS[order.ear_side]}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      <p>{order.supplier_name || '—'}</p>
                      {order.supplier_invoice && <p className="text-xs text-slate-400">NF: {order.supplier_invoice}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtDate(order.date_impression)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtDate(order.date_received)}</TableCell>
                    <TableCell className="text-sm font-medium">{fmtCurrency(order.sale_price)}</TableCell>
                    <TableCell><MoldStatusBadge status={order.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* Botão atalho receber */}
                        {['enviado_ao_fornecedor', 'em_producao'].includes(order.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar como Recebido"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleMarkReceived(order)}
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Botão WhatsApp quando recebido */}
                        {order.status === 'recebido' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Notificar cliente via WhatsApp"
                            className={`h-8 w-8 ${order.whatsapp_sent ? 'text-slate-300' : 'text-green-600 hover:bg-green-50'}`}
                            onClick={() => handleWhatsApp(order)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                          onClick={() => handleEdit(order)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Cards Mobile */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-slate-400">Carregando...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">Nenhuma ordem encontrada</Card>
        ) : (
          filtered.map(order => (
            <Card key={order.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[#6B3FA0]">{order.order_number}</span>
                    <MoldStatusBadge status={order.status} />
                  </div>
                  <p className="font-semibold text-slate-800 mt-1">{order.client_name}</p>
                  <p className="text-sm text-slate-500">{PRODUCT_LABELS[order.product_type]} — {EAR_LABELS[order.ear_side]}</p>
                </div>
                <div className="flex gap-1">
                  {order.status === 'recebido' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleWhatsApp(order)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {['enviado_ao_fornecedor', 'em_producao'].includes(order.status) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleMarkReceived(order)}>
                      <Truck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(order)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>Fornecedor: <span className="text-slate-700 font-medium">{order.supplier_name || '—'}</span></div>
                <div>Impressão: <span className="text-slate-700 font-medium">{fmtDate(order.date_impression)}</span></div>
                {order.date_received && <div>Recebido: <span className="text-emerald-700 font-medium">{fmtDate(order.date_received)}</span></div>}
                <div>Valor: <span className="text-slate-700 font-medium">{fmtCurrency(order.sale_price)}</span></div>
              </div>
            </Card>
          ))
        )}
      </div>

      <MoldOrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        onSuccess={loadData}
      />
    </div>
  );
}