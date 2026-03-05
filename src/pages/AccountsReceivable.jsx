import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Filter, MoreVertical, Eye, DollarSign, AlertCircle, Clock, CheckCircle2, Search, X, CreditCard, Wallet, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export default function AccountsReceivable() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterMethod, setFilterMethod] = useState('todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Installment.list('due_date');
      // Ordenar: atrasados primeiro, depois pendentes, depois pagos
      const sortedData = data.sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueDateA = new Date(a.due_date);
        dueDateA.setHours(0, 0, 0, 0);
        const dueDateB = new Date(b.due_date);
        dueDateB.setHours(0, 0, 0, 0);
        
        const isOverdueA = a.payment_status !== 'pago' && dueDateA < today;
        const isOverdueB = b.payment_status !== 'pago' && dueDateB < today;
        
        // Atrasados primeiro
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        
        // Dentro do mesmo grupo, ordenar por data de vencimento
        return dueDateA - dueDateB;
      });
      setInstallments(sortedData);
    } catch (error) {
      toast.error('Erro ao carregar parcelas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (installment) => {
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (installment.payment_status === 'pago') {
      return { label: 'Pago', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    } else if (dueDate < today) {
      return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    } else if (installment.payment_status === 'parcialmente_pago') {
      return { label: 'Parcial', color: 'bg-amber-100 text-amber-700', icon: Clock };
    }
    return { label: 'Pendente', color: 'bg-blue-100 text-blue-700', icon: Clock };
  };

  const filteredInstallments = installments.filter(inst => {
    const matchSearch = searchTerm === '' || 
      inst.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.sale_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const dueDate = new Date(inst.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let matchStatus = true;
    if (filterStatus === 'pago') matchStatus = inst.payment_status === 'pago';
    else if (filterStatus === 'atrasado') matchStatus = inst.payment_status !== 'pago' && dueDate < today;
    else if (filterStatus === 'pendente') matchStatus = inst.payment_status !== 'pago';

    const matchMethod = filterMethod === 'todos' || inst.payment_method === filterMethod;

    const matchDate = (!dateStart || !dateEnd) || (
      new Date(inst.due_date) >= new Date(dateStart) &&
      new Date(inst.due_date) <= new Date(dateEnd)
    );

    return matchSearch && matchStatus && matchMethod && matchDate;
  });

  const getGrossAmount = (inst) => inst.gross_amount || inst.original_amount || 0;

  const getNetAmount = (inst) => {
    if (inst.net_amount !== undefined && inst.net_amount !== null) return inst.net_amount;
    if (inst.fee_rate > 0) return getGrossAmount(inst) * (1 - inst.fee_rate / 100);
    return getGrossAmount(inst);
  };

  const getFeeAmount = (inst) => {
    if (inst.fee_amount !== undefined && inst.fee_amount !== null) return inst.fee_amount;
    if (inst.fee_rate > 0) return getGrossAmount(inst) * (inst.fee_rate / 100);
    return 0;
  };

  const getNetRemaining = (inst) => {
    const feeRatio = getGrossAmount(inst) > 0 ? getNetAmount(inst) / getGrossAmount(inst) : 1;
    return (inst.remaining_amount || 0) * feeRatio;
  };

  const stats = {
    toReceive: filteredInstallments.filter(i => i.payment_status !== 'pago').reduce((sum, i) => sum + (i.remaining_amount || 0), 0),
    overdue: filteredInstallments.filter(i => {
      if (i.payment_status === 'pago') return false;
      const dueDate = new Date(i.due_date);
      const today = new Date();
      return dueDate < today;
    }).reduce((sum, i) => sum + (i.remaining_amount || 0), 0),
    pixParcelado: filteredInstallments.filter(i => i.payment_method === 'pix_parcelado' && i.payment_status !== 'pago').length,
    cartaoCredito: filteredInstallments.filter(i => i.payment_method === 'cartao_credito' && i.payment_status !== 'pago').length,
    totalPaid: filteredInstallments.filter(i => i.payment_status === 'pago').reduce((sum, i) => sum + getGrossAmount(i), 0)
  };

  const handlePayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!paymentDate) {
      toast.error('Informe a data do pagamento');
      return;
    }

    const amount = Number(paymentAmount);
    if (amount > selectedInstallment.remaining_amount) {
      toast.error('Valor maior que o saldo devedor');
      return;
    }

    try {
      const newPaidAmount = selectedInstallment.paid_amount + amount;
      const newRemainingAmount = selectedInstallment.remaining_amount - amount;
      const paymentHistory = selectedInstallment.payment_history || [];
      
      paymentHistory.push({
        date: paymentDate,
        amount: amount,
        note: 'Pagamento recebido'
      });

      await base44.entities.Installment.update(selectedInstallment.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        payment_status: newRemainingAmount === 0 ? 'pago' : 'parcialmente_pago',
        last_payment_date: paymentDate,
        payment_history: paymentHistory
      });

      toast.success('Pagamento registrado!');
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentDate('');
      loadInstallments();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleEdit = async () => {
    try {
      await base44.entities.Installment.update(selectedInstallment.id, {
        due_date: editData.due_date,
        original_amount: Number(editData.original_amount),
        paid_amount: Number(editData.paid_amount),
        remaining_amount: Number(editData.original_amount) - Number(editData.paid_amount),
        payment_status: Number(editData.paid_amount) >= Number(editData.original_amount) ? 'pago' : Number(editData.paid_amount) > 0 ? 'parcialmente_pago' : selectedInstallment.payment_status === 'pago' ? 'pendente' : selectedInstallment.payment_status,
        last_payment_date: editData.last_payment_date || selectedInstallment.last_payment_date,
      });
      toast.success('Parcela atualizada!');
      setEditOpen(false);
      loadInstallments();
    } catch (error) {
      toast.error('Erro ao atualizar parcela');
    }
  };

  const openEdit = (inst) => {
    setSelectedInstallment(inst);
    setEditData({
      due_date: inst.due_date,
      original_amount: inst.original_amount,
      paid_amount: inst.paid_amount || 0,
      last_payment_date: inst.last_payment_date || '',
    });
    setEditOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('todos');
    setFilterMethod('todos');
    setDateStart('');
    setDateEnd('');
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Método de Pagamento</Label>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pix_parcelado">PIX Parcelado</SelectItem>
            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Período</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          Limpar
        </Button>
        <Button onClick={() => setFilterOpen(false)} className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]">
          Aplicar
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contas a Receber</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus recebíveis e parcelas</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterStatus('pendente')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">A Receber</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(stats.toReceive)}</p>
            </div>
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterStatus('atrasado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Atrasado</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
            </div>
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterMethod('pix_parcelado')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">PIX Parcelado</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.pixParcelado}</p>
              <p className="text-xs text-slate-500">parcelas pendentes</p>
            </div>
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterMethod('cartao_credito')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Cartão Crédito</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.cartaoCredito}</p>
              <p className="text-xs text-slate-500">parcelas pendentes</p>
            </div>
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterStatus('pago')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Recebido</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
          </div>
        </Card>
      </div>

      {/* Filters - Desktop */}
      <Card className="p-4 hidden lg:block">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-sm mb-2">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, número da venda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="w-40">
            <Label className="text-sm mb-2">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-sm mb-2">Método</Label>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pix_parcelado">PIX Parcelado</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-36" />
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-36" />
          </div>

          <Button variant="outline" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      </Card>

      {/* Filters - Mobile */}
      <div className="lg:hidden space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {(filterStatus !== 'todos' || filterMethod !== 'todos' || dateStart || dateEnd) && (
                <span className="ml-2 bg-[#6B3FA0] text-white text-xs px-2 py-0.5 rounded-full">
                  Ativos
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Table - Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método / Bandeira</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Dt. Pagamento</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInstallments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  Nenhuma parcela encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredInstallments.map(inst => {
                const badge = getStatusBadge(inst);
                const Icon = badge.icon;
                return (
                  <TableRow key={inst.id} className="hover:bg-slate-50">
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{inst.client_name}</TableCell>
                    <TableCell>
                     {inst.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão Crédito'}
                     {inst.card_brand && <span className="ml-1 text-xs text-slate-500">({inst.card_brand})</span>}
                    </TableCell>
                    <TableCell>{inst.installment_number}</TableCell>
                    <TableCell>{formatLocalDate(inst.due_date)}</TableCell>
                    <TableCell>{inst.last_payment_date ? formatLocalDate(inst.last_payment_date) : <span className="text-slate-400 text-xs">—</span>}</TableCell>
                    <TableCell className="text-right">{formatCurrency(getGrossAmount(inst))}</TableCell>
                    <TableCell className="text-right text-amber-600 text-xs">
                      {getFeeAmount(inst) > 0
                        ? <span>{inst.fee_rate}% ({formatCurrency(getFeeAmount(inst))})</span>
                        : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(getNetAmount(inst))}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedInstallment(inst); setDetailsOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(inst)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {inst.payment_status !== 'pago' && (
                            <DropdownMenuItem onClick={() => { 
                              setSelectedInstallment(inst); 
                              setPaymentAmount(String(inst.remaining_amount)); 
                              setPaymentDate(new Date().toISOString().split('T')[0]); 
                              setPaymentOpen(true); 
                            }}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Receber Pagamento
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredInstallments.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhuma parcela encontrada
          </Card>
        ) : (
          filteredInstallments.map(inst => {
            const badge = getStatusBadge(inst);
            const Icon = badge.icon;
            return (
              <Card key={inst.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{inst.client_name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {inst.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão'} • Parcela {inst.installment_number} • {formatLocalDate(inst.due_date)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedInstallment(inst); setDetailsOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(inst)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {inst.payment_status !== 'pago' && (
                          <DropdownMenuItem onClick={() => { 
                            setSelectedInstallment(inst); 
                            setPaymentAmount(String(inst.remaining_amount)); 
                            setPaymentDate(new Date().toISOString().split('T')[0]); 
                            setPaymentOpen(true); 
                          }}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Receber
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(inst.remaining_amount)}</div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Parcela</DialogTitle>
          </DialogHeader>
          {selectedInstallment && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Cliente:</span>
                <p className="font-medium">{selectedInstallment.client_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Venda:</span>
                <p className="font-medium">{selectedInstallment.sale_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Parcela:</span>
                <p className="font-medium">{selectedInstallment.installment_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Vencimento:</span>
                <p className="font-medium">{formatLocalDate(selectedInstallment.due_date)}</p>
              </div>
              <div>
                <span className="text-slate-500">Valor Original:</span>
                <p className="font-medium">{formatCurrency(selectedInstallment.original_amount)}</p>
              </div>
              <div>
                <span className="text-slate-500">Valor Pago:</span>
                <p className="font-medium">{formatCurrency(selectedInstallment.paid_amount)}</p>
              </div>
              <div>
                <span className="text-slate-500">Saldo:</span>
                <p className="font-medium text-lg">{formatCurrency(selectedInstallment.remaining_amount)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={editData.due_date || ''} onChange={(e) => setEditData(d => ({ ...d, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Valor Original (R$)</Label>
              <Input type="number" step="0.01" value={editData.original_amount || ''} onChange={(e) => setEditData(d => ({ ...d, original_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Valor Pago (R$)</Label>
              <Input type="number" step="0.01" value={editData.paid_amount || ''} onChange={(e) => setEditData(d => ({ ...d, paid_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Data do Último Pagamento</Label>
              <Input type="date" value={editData.last_payment_date || ''} onChange={(e) => setEditData(d => ({ ...d, last_payment_date: e.target.value }))} />
            </div>
            {editData.original_amount && (
              <div className="bg-slate-50 p-3 rounded text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Saldo restante:</span>
                  <span className="font-bold">{formatCurrency(Number(editData.original_amount) - Number(editData.paid_amount || 0))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} className="bg-[#6B3FA0] hover:bg-[#834CB8]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data do Pagamento *</Label>
              <Input 
                type="date" 
                value={paymentDate} 
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Valor a Receber (R$) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={selectedInstallment?.remaining_amount}
              />
            </div>
            {selectedInstallment && (
              <div className="bg-slate-50 p-3 rounded space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Saldo atual:</span>
                  <span className="font-medium">{formatCurrency(selectedInstallment.remaining_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Novo saldo:</span>
                  <span className="font-bold">{formatCurrency(selectedInstallment.remaining_amount - (Number(paymentAmount) || 0))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button>
            <Button onClick={handlePayment} className="bg-emerald-600 hover:bg-emerald-700">Confirmar Recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}