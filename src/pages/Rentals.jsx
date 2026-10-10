import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import RentalForm from '@/components/rentals/RentalForm';
import RentalDetailsDialog from '@/components/rentals/RentalDetailsDialog';
import CloseRentalDialog from '@/components/rentals/CloseRentalDialog';
import { toast } from 'sonner';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import {
  Repeat,
  Search,
  X,
  MoreVertical,
  Eye,
  Pencil,
  StopCircle,
  Trash2,
  RefreshCw,
  AlertCircle,
  DollarSign,
  CheckCircle2
} from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const statusStyles = {
  ativa: 'bg-emerald-100 text-emerald-700',
  encerrada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-100 text-red-700'
};

const statusLabels = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada'
};

const today = () => new Date().toISOString().split('T')[0];

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [stats, setStats] = useState({ pending: 0, received: 0, overdue: 0, openCharges: 0 });
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: 'todas', dateStart: '', dateEnd: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = {};
      if (filters.status !== 'todas') query.status = filters.status;
      if (filters.dateStart) query.start_date = { $gte: filters.dateStart };
      if (filters.dateEnd) query.start_date = { ...(query.start_date || {}), $lte: filters.dateEnd };
      if (filters.search.trim()) {
        const term = filters.search.trim();
        query.$or = [
          { client_name: { $regex: term, $options: 'i' } },
          { rental_number: { $regex: term, $options: 'i' } },
          { serial_number: { $regex: term, $options: 'i' } },
          { product_name: { $regex: term, $options: 'i' } }
        ];
      }

      const [page, user, active, byStatus, overdueRows] = await Promise.all([
        base44.entities.Rental.filter(query, { sort: '-created_date', limit: 100 }),
        base44.auth.me(),
        base44.entities.Rental.count({ status: 'ativa' }),
        base44.entities.RentalCharge.aggregate({
          groupBy: 'status',
          sum: ['remaining_amount', 'paid_amount']
        }),
        base44.entities.RentalCharge.aggregate({
          query: { status: { $in: ['pendente', 'parcial'] }, due_date: { $lt: today() } },
          sum: ['remaining_amount']
        })
      ]);

      setRentals(page.items || []);
      setCurrentUser(user);
      setActiveCount(active || 0);

      const rows = byStatus?.rows || [];
      const rowFor = (status) =>
        rows.find((r) => r.status === status) || { count: 0, sum_remaining_amount: 0, sum_paid_amount: 0 };
      const pendente = rowFor('pendente');
      const parcial = rowFor('parcial');
      const pago = rowFor('pago');

      setStats({
        pending: (pendente.sum_remaining_amount || 0) + (parcial.sum_remaining_amount || 0),
        received: (pago.sum_paid_amount || 0) + (parcial.sum_paid_amount || 0),
        overdue: (overdueRows?.rows || []).reduce((sum, r) => sum + (r.sum_remaining_amount || 0), 0),
        openCharges: (pendente.count || 0) + (parcial.count || 0)
      });
    } catch (error) {
      toast.error('Erro ao carregar locações');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('gerarCobrancasLocacao', {});
      const created = res?.data?.created ?? 0;
      toast.success(created > 0 ? `${created} cobrança(s) gerada(s)` : 'Nenhuma cobrança nova');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Erro ao gerar cobranças');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (rental) => {
    if (rental.status === 'ativa') {
      toast.error('Encerre a locação antes de excluir');
      return;
    }
    try {
      await base44.entities.RentalCharge.deleteMany({ rental_id: rental.id });
      await base44.entities.Rental.delete(rental.id);
      toast.success('Locação excluída');
      load();
    } catch (error) {
      toast.error('Erro ao excluir locação');
    }
  };

  const clearFilters = () => setFilters({ search: '', status: 'todas', dateStart: '', dateEnd: '' });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locações de AASI"
        description="Controle das locações de aparelhos, cobranças mensais e devoluções"
        action={() => {
          setEditingRental(null);
          setFormOpen(true);
        }}
        actionLabel="Nova Locação"
        actionIcon={Repeat}
      />

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Locações Ativas" value={activeCount} icon={Repeat} color="purple" />
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500 font-medium">A Receber</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.pending)}</p>
              <p className="text-xs text-slate-500">{stats.openCharges} cobranças em aberto</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500 font-medium">Atrasado</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-0 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-500 font-medium">Total Recebido</p>
              <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.received)}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros Desktop */}
      <Card className="p-4 hidden lg:block">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-sm mb-2">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, nº da locação, aparelho ou série..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setFilters({ ...filters, search: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="w-44">
            <Label className="text-sm mb-2">Situação</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="encerrada">Encerradas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div>
              <Label className="text-sm mb-2">Início</Label>
              <Input
                type="date"
                value={filters.dateStart}
                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                className="w-36"
              />
            </div>
            <div>
              <Label className="text-sm mb-2">Fim</Label>
              <Input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                className="w-36"
              />
            </div>
          </div>

          <Button variant="outline" onClick={clearFilters}>
            Limpar
          </Button>
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Gerar cobranças
          </Button>
        </div>
      </Card>

      {/* Filtros Mobile */}
      <div className="lg:hidden space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar locação..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="encerrada">Encerradas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Gerar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={filters.dateStart}
            onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
          />
          <Input
            type="date"
            value={filters.dateEnd}
            onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
          />
        </div>
      </div>

      {/* Tabela Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Locação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Aparelho</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead className="text-right">Mensal</TableHead>
              <TableHead>Venc.</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                  Carregando locações...
                </TableCell>
              </TableRow>
            ) : rentals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                  <Repeat className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  Nenhuma locação encontrada
                </TableCell>
              </TableRow>
            ) : (
              rentals.map((rental) => (
                <TableRow
                  key={rental.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedRental(rental);
                    setDetailsOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{rental.rental_number}</TableCell>
                  <TableCell>
                    {rental.client_name}
                    <span className="block text-xs text-slate-400">{rental.client_phone || ''}</span>
                  </TableCell>
                  <TableCell>
                    {rental.product_name}
                    <span className="block text-xs text-slate-400">
                      NS: {rental.serial_number || '—'}
                    </span>
                  </TableCell>
                  <TableCell>{formatLocalDate(rental.start_date)}</TableCell>
                  <TableCell>
                    {rental.term_type === 'indeterminado' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                        Indeterminado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">
                        até {rental.end_date ? formatLocalDate(rental.end_date) : '—'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(rental.monthly_amount)}
                  </TableCell>
                  <TableCell>Dia {rental.due_day}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        statusStyles[rental.status] || statusStyles.encerrada
                      }`}
                    >
                      {statusLabels[rental.status] || rental.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRental(rental);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes e cobranças
                        </DropdownMenuItem>
                        {rental.status === 'ativa' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingRental(rental);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => {
                                setSelectedRental(rental);
                                setCloseOpen(true);
                              }}
                            >
                              <StopCircle className="h-4 w-4 mr-2" />
                              Encerrar locação
                            </DropdownMenuItem>
                          </>
                        )}
                        {currentUser?.role === 'admin' && rental.status !== 'ativa' && (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(rental)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards Mobile */}
      <div className="lg:hidden space-y-3">
        {rentals.length === 0 && !loading ? (
          <Card className="p-8 text-center text-slate-500">
            <Repeat className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            Nenhuma locação encontrada
          </Card>
        ) : (
          rentals.map((rental) => (
            <Card key={rental.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{rental.rental_number}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          statusStyles[rental.status] || statusStyles.encerrada
                        }`}
                      >
                        {statusLabels[rental.status] || rental.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{rental.client_name}</p>
                    <p className="text-xs text-slate-400">
                      {rental.product_name} · NS {rental.serial_number || '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Início {formatLocalDate(rental.start_date)}
                      {rental.term_type === 'indeterminado'
                        ? ' · prazo indeterminado'
                        : rental.end_date
                        ? ` até ${formatLocalDate(rental.end_date)}`
                        : ''}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRental(rental);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      {rental.status === 'ativa' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingRental(rental);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setSelectedRental(rental);
                              setCloseOpen(true);
                            }}
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Encerrar
                          </DropdownMenuItem>
                        </>
                      )}
                      {currentUser?.role === 'admin' && rental.status !== 'ativa' && (
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(rental)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Venc. dia {rental.due_day}</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(rental.monthly_amount)}
                    <span className="text-xs font-normal text-slate-500"> /mês</span>
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      <RentalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        rental={editingRental}
        onSuccess={load}
      />

      <RentalDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        rental={selectedRental}
        onChanged={load}
        onEditRental={(rental) => {
          setEditingRental(rental);
          setFormOpen(true);
        }}
        onEndRental={(rental) => {
          setSelectedRental(rental);
          setCloseOpen(true);
        }}
      />

      <CloseRentalDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        rental={selectedRental}
        onClosed={load}
      />
    </div>
  );
}