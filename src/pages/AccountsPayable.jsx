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
import { Plus, Filter, MoreVertical, Eye, Edit, Trash2, DollarSign, AlertCircle, Clock, CheckCircle2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import ExpenseForm from '@/components/financial/ExpenseForm';

export default function AccountsPayable() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterCounterparty, setFilterCounterparty] = useState('todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentData, setPaymentData] = useState({ date: '', fees: 0 });
  const [filterOpen, setFilterOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    loadExpenses();
    loadFilters();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Expense.list('-payment_date');
      setExpenses(data);
    } catch (error) {
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [cats, counters] = await Promise.all([
        base44.entities.ExpenseCategory.filter({ type: 'despesa' }),
        base44.entities.Counterparty.list()
      ]);
      setCategories(cats);
      setCounterparties(counters);
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (expense) => {
    const dueDate = new Date(expense.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (expense.status === 'pago') {
      return { label: 'Pago', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    } else if (dueDate < today) {
      return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    } else if (dueDate.getTime() === today.getTime() || (dueDate - today) / (1000 * 60 * 60 * 24) <= 7) {
      return { label: 'Vence em breve', color: 'bg-amber-100 text-amber-700', icon: Clock };
    }
    return { label: 'A Pagar', color: 'bg-blue-100 text-blue-700', icon: Clock };
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = searchTerm === '' || 
      exp.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.counterparty_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const dueDate = new Date(exp.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let matchStatus = true;
    if (filterStatus === 'pago') matchStatus = exp.status === 'pago';
    else if (filterStatus === 'atrasado') matchStatus = exp.status !== 'pago' && dueDate < today;
    else if (filterStatus === 'vence_breve') matchStatus = exp.status !== 'pago' && dueDate >= today && (dueDate - today) / (1000 * 60 * 60 * 24) <= 7;
    else if (filterStatus === 'a_pagar') matchStatus = exp.status !== 'pago';

    const matchCategory = filterCategory === 'todas' || exp.category_id === filterCategory;
    const matchCounterparty = filterCounterparty === 'todos' || exp.counterparty_id === filterCounterparty;

    const matchDate = (!dateStart || !dateEnd) || (
      new Date(exp.due_date) >= new Date(dateStart) &&
      new Date(exp.due_date) <= new Date(dateEnd)
    );

    return matchSearch && matchStatus && matchCategory && matchCounterparty && matchDate;
  });

  const stats = {
    toPay: filteredExpenses.filter(e => e.status !== 'pago').reduce((sum, e) => sum + (e.amount || 0), 0),
    overdue: filteredExpenses.filter(e => {
      if (e.status === 'pago') return false;
      const dueDate = new Date(e.due_date);
      const today = new Date();
      return dueDate < today;
    }).reduce((sum, e) => sum + (e.amount || 0), 0),
    dueSoon: filteredExpenses.filter(e => {
      if (e.status === 'pago') return false;
      const dueDate = new Date(e.due_date);
      const today = new Date();
      const diff = (dueDate - today) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).reduce((sum, e) => sum + (e.amount || 0), 0),
    paid: filteredExpenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + (e.amount || 0), 0)
  };

  const handlePay = async () => {
    if (!paymentData.date) {
      toast.error('Informe a data de pagamento');
      return;
    }

    try {
      const totalAmount = selectedExpense.amount + (Number(paymentData.fees) || 0);
      await base44.entities.Expense.update(selectedExpense.id, {
        status: 'pago',
        payment_date: paymentData.date,
        amount: totalAmount
      });
      toast.success('Pagamento registrado!');
      setPaymentOpen(false);
      setPaymentData({ date: '', fees: 0 });
      loadExpenses();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Expense.delete(selectedExpense.id);
      toast.success('Despesa excluída!');
      setDeleteOpen(false);
      loadExpenses();
    } catch (error) {
      toast.error('Erro ao excluir despesa');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('todos');
    setFilterCategory('todas');
    setFilterCounterparty('todos');
    setDateStart('');
    setDateEnd('');
    setVisibleCount(25);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(25);
  }, [searchTerm, filterStatus, filterCategory, filterCounterparty, dateStart, dateEnd]);

  const visibleExpenses = filteredExpenses.slice(0, visibleCount);
  const hasMore = filteredExpenses.length > visibleCount;

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
            <SelectItem value="a_pagar">A Pagar</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="vence_breve">Vence em Breve</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Categoria</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Fornecedor</Label>
        <Select value={filterCounterparty} onValueChange={setFilterCounterparty}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {counterparties.map(cp => (
              <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
            ))}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contas a Pagar</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas despesas e pagamentos</p>
        </div>
        <Button onClick={() => { setSelectedExpense(null); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterStatus('a_pagar')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">A Pagar</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(stats.toPay)}</p>
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
          onClick={() => setFilterStatus('vence_breve')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Vence em Breve</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{formatCurrency(stats.dueSoon)}</p>
            </div>
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setFilterStatus('pago')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Pago</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.paid)}</p>
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
                placeholder="Buscar por categoria, fornecedor..."
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
                <SelectItem value="a_pagar">A Pagar</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="vence_breve">Vence em Breve</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-sm mb-2">Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-sm mb-2">Fornecedor</Label>
            <Select value={filterCounterparty} onValueChange={setFilterCounterparty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {counterparties.map(cp => (
                  <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                ))}
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
              {(filterStatus !== 'todos' || filterCategory !== 'todas' || filterCounterparty !== 'todos' || dateStart || dateEnd) && (
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
              <TableHead>Categoria</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Dt. Pagamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  Nenhuma despesa encontrada
                </TableCell>
              </TableRow>
            ) : (
              visibleExpenses.map(exp => {
                const badge = getStatusBadge(exp);
                const Icon = badge.icon;
                return (
                  <TableRow key={exp.id} className="hover:bg-slate-50">
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{exp.category_name}</TableCell>
                    <TableCell>{exp.counterparty_name || '-'}</TableCell>
                    <TableCell>{format(new Date(exp.due_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setDetailsOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setFormOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {exp.status !== 'pago' && (
                            <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setPaymentData({ date: format(new Date(), 'yyyy-MM-dd'), fees: 0 }); setPaymentOpen(true); }}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Registrar Pagamento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setDeleteOpen(true); }} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="p-4 text-center border-t">
            <Button variant="outline" onClick={() => setVisibleCount(v => v + 25)}>
              Carregar mais ({filteredExpenses.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredExpenses.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhuma despesa encontrada
          </Card>
        ) : (
          visibleExpenses.map(exp => {
            const badge = getStatusBadge(exp);
            const Icon = badge.icon;
            return (
              <Card key={exp.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{exp.counterparty_name || 'Sem fornecedor'}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {exp.category_name} • {format(new Date(exp.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setDetailsOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setFormOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {exp.status !== 'pago' && (
                          <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setPaymentData({ date: format(new Date(), 'yyyy-MM-dd'), fees: 0 }); setPaymentOpen(true); }}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Pagar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setSelectedExpense(exp); setDeleteOpen(true); }} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(exp.amount)}</div>
                </div>
              </Card>
            );
          })
        )}
        {hasMore && (
          <div className="text-center pt-2">
            <Button variant="outline" onClick={() => setVisibleCount(v => v + 25)}>
              Carregar mais ({filteredExpenses.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ExpenseForm 
        open={formOpen} 
        onOpenChange={setFormOpen}
        expense={selectedExpense}
        onSuccess={loadExpenses}
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Despesa</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Categoria:</span>
                <p className="font-medium">{selectedExpense.category_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Fornecedor:</span>
                <p className="font-medium">{selectedExpense.counterparty_name || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Vencimento:</span>
                <p className="font-medium">{format(new Date(selectedExpense.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
              <div>
                <span className="text-slate-500">Valor:</span>
                <p className="font-medium text-lg">{formatCurrency(selectedExpense.amount)}</p>
              </div>
              {selectedExpense.notes && (
                <div>
                  <span className="text-slate-500">Observações:</span>
                  <p className="font-medium">{selectedExpense.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" value={paymentData.date} onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })} />
            </div>
            <div>
              <Label>Juros/Multa (R$)</Label>
              <Input type="number" step="0.01" value={paymentData.fees} onChange={(e) => setPaymentData({ ...paymentData, fees: e.target.value })} />
            </div>
            {selectedExpense && (
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-sm text-slate-600">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency((selectedExpense.amount || 0) + (Number(paymentData.fees) || 0))}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} className="bg-emerald-600 hover:bg-emerald-700">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}