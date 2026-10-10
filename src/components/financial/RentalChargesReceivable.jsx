import React, { useState, useEffect, useCallback } from 'react';
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
import RentalChargesList from '@/components/rentals/RentalChargesList';
import RentalChargePaymentDialog from '@/components/rentals/RentalChargePaymentDialog';
import { ArrowLeft, AlertCircle, CheckCircle2, DollarSign, Repeat } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const today = () => new Date().toISOString().split('T')[0];

/**
 * Contas a receber das locações de AASI (integração com Contas a Receber).
 */
export default function RentalChargesReceivable({ onBack }) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, overdue: 0, received: 0, open: 0 });
  const [filters, setFilters] = useState({ status: 'abertas', dateStart: '', dateEnd: '' });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = {};
      if (filters.status === 'abertas') query.status = { $in: ['pendente', 'parcial'] };
      else if (filters.status === 'pagas') query.status = 'pago';
      else if (filters.status === 'canceladas') query.status = 'cancelado';
      else if (filters.status === 'atrasadas') {
        query.status = { $in: ['pendente', 'parcial'] };
        query.due_date = { $lt: today() };
      }

      if (filters.dateStart || filters.dateEnd) {
        query.due_date = { ...(query.due_date || {}) };
        if (filters.dateStart) query.due_date.$gte = filters.dateStart;
        if (filters.dateEnd) query.due_date.$lte = filters.dateEnd;
      }

      const [page, byStatus, overdueRows] = await Promise.all([
        base44.entities.RentalCharge.filter(query, { sort: 'due_date', limit: 300 }),
        base44.entities.RentalCharge.aggregate({
          groupBy: 'status',
          sum: ['remaining_amount', 'paid_amount']
        }),
        base44.entities.RentalCharge.aggregate({
          query: { status: { $in: ['pendente', 'parcial'] }, due_date: { $lt: today() } },
          sum: ['remaining_amount']
        })
      ]);

      setCharges(page.items || []);

      const rows = byStatus?.rows || [];
      const rowFor = (status) =>
        rows.find((r) => r.status === status) || { count: 0, sum_remaining_amount: 0, sum_paid_amount: 0 };
      const pendente = rowFor('pendente');
      const parcial = rowFor('parcial');
      const pago = rowFor('pago');

      setStats({
        pending:
          (pendente.sum_remaining_amount || 0) + (parcial.sum_remaining_amount || 0),
        overdue: (overdueRows?.rows || []).reduce((sum, r) => sum + (r.sum_remaining_amount || 0), 0),
        received: (pago.sum_paid_amount || 0) + (parcial.sum_paid_amount || 0),
        open: (pendente.count || 0) + (parcial.count || 0)
      });
    } catch (error) {
      toast.error('Erro ao carregar cobranças de locação');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Cobranças de Locação</h1>
            <p className="text-sm text-slate-500 mt-1">
              Recebíveis mensais gerados pelas locações de AASI
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">A Receber</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {formatCurrency(stats.pending)}
              </p>
              <p className="text-xs text-slate-500">{stats.open} cobranças em aberto</p>
            </div>
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setFilters({ ...filters, status: 'atrasadas' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Atrasado</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {formatCurrency(stats.overdue)}
              </p>
            </div>
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 opacity-60" />
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setFilters({ ...filters, status: 'pagas' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Recebido</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.received)}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Origem</p>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Repeat className="h-4 w-4 text-[#6B3FA0]" />
                Locações de AASI
              </p>
              <p className="text-xs text-slate-500 mt-1">Cobranças geradas automaticamente</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2">
            <Label className="text-sm">Situação</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abertas">Em aberto</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
                <SelectItem value="pagas">Pagas</SelectItem>
                <SelectItem value="canceladas">Canceladas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Período inicial</Label>
            <Input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Período final</Label>
            <Input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setFilters({ status: 'abertas', dateStart: '', dateEnd: '' })}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Lista */}
      <Card className="p-4">
        <RentalChargesList
          charges={charges}
          loading={loading}
          showClient
          onPay={(charge) => {
            setSelectedCharge(charge);
            setPaymentOpen(true);
          }}
        />
      </Card>

      <RentalChargePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        charge={selectedCharge}
        onPaid={load}
      />
    </div>
  );
}