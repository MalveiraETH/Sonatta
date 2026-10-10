import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Loader2 } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export const periodLabel = (period) => (period ? period.split('-').reverse().join('/') : '-');

export function chargeStatusInfo(charge) {
  if (charge.status === 'pago') return { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' };
  if (charge.status === 'cancelado') return { label: 'Cancelado', color: 'bg-slate-100 text-slate-500' };
  if (charge.status === 'parcial') return { label: 'Parcial', color: 'bg-amber-100 text-amber-700' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${charge.due_date}T00:00:00`);
  if (due < today) return { label: 'Atrasado', color: 'bg-red-100 text-red-700' };
  return { label: 'Pendente', color: 'bg-blue-100 text-blue-700' };
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

/**
 * Cobranças mensais de locação — tabela no desktop e cartões no mobile.
 */
export default function RentalChargesList({ charges, loading, onPay, showClient = false }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!charges || charges.length === 0) {
    return <p className="text-center text-slate-500 py-6 text-sm">Nenhuma cobrança gerada</p>;
  }

  const canPay = (charge) => charge.status === 'pendente' || charge.status === 'parcial';

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Período</TableHead>
              {showClient && <TableHead>Cliente</TableHead>}
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => {
              const badge = chargeStatusInfo(charge);
              return (
                <TableRow key={charge.id}>
                  <TableCell className="font-medium">{periodLabel(charge.period)}</TableCell>
                  {showClient && <TableCell>{charge.client_name}</TableCell>}
                  <TableCell>{formatLocalDate(charge.due_date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(charge.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(charge.paid_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(charge.remaining_amount)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {canPay(charge) && onPay ? (
                      <Button size="sm" variant="outline" onClick={() => onPay(charge)}>
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        Receber
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {charges.map((charge) => {
          const badge = chargeStatusInfo(charge);
          return (
            <Card key={charge.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{periodLabel(charge.period)}</p>
                  <p className="text-xs text-slate-500">
                    Venc. {formatLocalDate(charge.due_date)}
                    {showClient ? ` · ${charge.client_name}` : ''}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {formatCurrency(charge.amount)}
                  </p>
                  <p className="text-xs text-slate-500">Saldo: {formatCurrency(charge.remaining_amount)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                  {canPay(charge) && onPay && (
                    <Button size="sm" variant="outline" onClick={() => onPay(charge)}>
                      Receber
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}