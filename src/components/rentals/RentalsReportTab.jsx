import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Repeat, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import RentalChargesList from '@/components/rentals/RentalChargesList';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const today = () => new Date().toISOString().split('T')[0];

/**
 * Relatórios de locação — visão operacional e financeira.
 */
export default function RentalsReportTab() {
  const [rentals, setRentals] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', status: 'todas' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rentalQuery = {};
      if (filters.dateStart) rentalQuery.start_date = { $gte: filters.dateStart };
      if (filters.dateEnd) rentalQuery.start_date = { ...(rentalQuery.start_date || {}), $lte: filters.dateEnd };
      if (filters.status !== 'todas') rentalQuery.status = filters.status;

      const chargeQuery = {};
      if (filters.dateStart) chargeQuery.due_date = { $gte: filters.dateStart };
      if (filters.dateEnd) chargeQuery.due_date = { ...(chargeQuery.due_date || {}), $lte: filters.dateEnd };

      const [rentalsPage, chargesPage] = await Promise.all([
        base44.entities.Rental.filter(rentalQuery, { sort: '-start_date', limit: 500 }),
        base44.entities.RentalCharge.filter(chargeQuery, { sort: '-due_date', limit: 1000 })
      ]);

      setRentals(rentalsPage.items || []);
      setCharges(chargesPage.items || []);
    } catch (error) {
      toast.error('Erro ao carregar relatório de locações');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const billed = charges
    .filter((c) => c.status !== 'cancelado')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const received = charges.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  const pending = charges
    .filter((c) => c.status === 'pendente' || c.status === 'parcial')
    .reduce((sum, c) => sum + (c.remaining_amount || 0), 0);
  const overdue = charges
    .filter(
      (c) => (c.status === 'pendente' || c.status === 'parcial') && (c.due_date || '') < today()
    )
    .reduce((sum, c) => sum + (c.remaining_amount || 0), 0);

  const activeRentals = rentals.filter((r) => r.status === 'ativa').length;
  const closedRentals = rentals.filter((r) => r.status !== 'ativa').length;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Início do período</Label>
            <Input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fim do período</Label>
            <Input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Situação da locação</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters({ ...filters, status: v })}
            >
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
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFilters({ dateStart: '', dateEnd: '', status: 'todas' })}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Locações Ativas" value={activeRentals} icon={Repeat} color="purple" />
        <StatCard title="Encerradas" value={closedRentals} icon={Repeat} color="blue" />
        <Card className="p-6 border-0 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Cobrado</p>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(billed)}</p>
          <p className="text-xs text-slate-400 mt-1">Recebido: {formatCurrency(received)}</p>
        </Card>
        <Card className="p-6 border-0 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Em Aberto</p>
          <p className="text-3xl font-bold text-amber-600">{formatCurrency(pending)}</p>
          <p className="text-xs text-red-500 mt-1">Atrasado: {formatCurrency(overdue)}</p>
        </Card>
      </div>

      {/* Operacional */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Locações ({rentals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-slate-400 py-6 text-sm">Carregando...</p>
          ) : rentals.length === 0 ? (
            <p className="text-center text-slate-500 py-6 text-sm">
              Nenhuma locação no período selecionado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4 font-medium">Locação</th>
                    <th className="py-2 pr-4 font-medium">Cliente</th>
                    <th className="py-2 pr-4 font-medium">Aparelho</th>
                    <th className="py-2 pr-4 font-medium">Início</th>
                    <th className="py-2 pr-4 font-medium">Término</th>
                    <th className="py-2 pr-4 font-medium">Prazo</th>
                    <th className="py-2 pr-4 font-medium text-right">Mensal</th>
                    <th className="py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((rental) => (
                    <tr key={rental.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{rental.rental_number}</td>
                      <td className="py-2 pr-4">{rental.client_name}</td>
                      <td className="py-2 pr-4">
                        {rental.product_name}
                        <span className="block text-xs text-slate-400">
                          NS: {rental.serial_number || '—'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{formatLocalDate(rental.start_date)}</td>
                      <td className="py-2 pr-4">
                        {rental.end_date || rental.termination_date
                          ? formatLocalDate(rental.end_date || rental.termination_date)
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {rental.term_type === 'indeterminado' ? 'Indeterminado' : 'Definido'}
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(rental.monthly_amount)}</td>
                      <td className="py-2 capitalize">{rental.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financeiro */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Cobranças de locação ({charges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <RentalChargesList charges={charges} loading={loading} showClient />
        </CardContent>
      </Card>
    </div>
  );
}