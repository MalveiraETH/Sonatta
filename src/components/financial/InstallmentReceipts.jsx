import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ArrowDownLeft } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

/** Recebimentos registrados em uma parcela — cada um com sua própria data. */
export const getReceipts = (installment) =>
  (installment?.payment_history || []).filter((entry) => Number(entry.amount) > 0);

/** Linhas extras na tabela: um recebimento por linha, com a data em que foi recebido. */
export default function ReceiptTableRows({ installment }) {
  const receipts = getReceipts(installment);
  if (receipts.length === 0) return null;

  return receipts.map((entry, index) => (
    <TableRow key={`${installment.id}-receipt-${index}`} className="bg-emerald-50/40">
      <TableCell className="py-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
          <ArrowDownLeft className="h-3 w-3" />
          Recebido
        </span>
      </TableCell>
      <TableCell className="py-1.5 text-xs text-slate-500">
        ↳ Parcela {installment.installment_number}
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell />
      <TableCell className="py-1.5 text-xs">
        {entry.date ? formatLocalDate(entry.date) : <span className="text-slate-400">—</span>}
      </TableCell>
      <TableCell className="py-1.5 text-right text-xs text-emerald-700">
        {formatCurrency(entry.amount)}
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell />
    </TableRow>
  ));
}

/** Lista de recebimentos para o card mobile. */
export function ReceiptList({ installment }) {
  const receipts = getReceipts(installment);
  if (receipts.length === 0) return null;

  return (
    <div className="border-t pt-2 mt-1 space-y-1">
      {receipts.map((entry, index) => (
        <div
          key={`${installment.id}-receipt-mobile-${index}`}
          className="flex items-center justify-between text-xs"
        >
          <span className="flex items-center gap-1 text-emerald-700">
            <ArrowDownLeft className="h-3 w-3" />
            Recebido {entry.date ? formatLocalDate(entry.date) : ''}
          </span>
          <span className="font-semibold text-emerald-700">{formatCurrency(entry.amount)}</span>
        </div>
      ))}
    </div>
  );
}