import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { Loader2, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const METODOS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'transferencia', label: 'Transferência' },
];

export default function QuitarSaldoDialog({ open, onOpenChange, sale, onSuccess }) {
  const [valor, setValor] = useState(0);
  const [dataRecebimento, setDataRecebimento] = useState('');
  const [metodo, setMetodo] = useState('pix');
  const [loading, setLoading] = useState(false);

  const saldoPendente = Number(sale?.pending_balance) || 0;

  useEffect(() => {
    if (open && sale) {
      setValor(Number(sale.pending_balance) || 0);
      setDataRecebimento(new Date().toISOString().split('T')[0]);
      setMetodo('pix');
    }
  }, [open, sale]);

  if (!sale) return null;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const valorRecebido = Number(valor) || 0;
  const saldoRestante = Math.max(0, Math.round((saldoPendente - valorRecebido) * 100) / 100);
  const excedente = Math.max(0, Math.round((valorRecebido - saldoPendente) * 100) / 100);
  const quitaVenda = valorRecebido > 0 && saldoRestante <= 0;

  const handleConfirm = async () => {
    if (valorRecebido <= 0) {
      toast.error('Informe o valor recebido');
      return;
    }
    setLoading(true);
    try {
      await base44.functions.invoke('quitarSaldoVenda', {
        sale_id: sale.id,
        amount: valorRecebido,
        payment_date: dataRecebimento,
        method: metodo,
      });
      toast.success(
        quitaVenda
          ? 'Saldo quitado! A venda foi marcada como Paga.'
          : 'Recebimento registrado. A venda continua Parcial.'
      );
      onOpenChange(false);
      if (onSuccess) await onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível registrar a quitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#6B3FA0]">
            <Wallet className="h-5 w-5" />
            Quitar Saldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="text-sm text-slate-600">
            Venda <span className="font-semibold text-slate-900">{sale.sale_number}</span> ·{' '}
            {sale.client_name}
          </div>

          <Card className="p-4 bg-amber-50 border-amber-300">
            <p className="text-xs text-amber-800">Saldo pendente</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(saldoPendente)}</p>
            {sale.pending_due_date && (
              <p className="text-xs text-amber-700 mt-1">
                Vencimento: {formatLocalDate(sale.pending_due_date)}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Valor recebido (R$)</Label>
              <CurrencyInput value={valor} onChange={(val) => setValor(val)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Data do recebimento</Label>
              <Input
                type="date"
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Forma de pagamento</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {excedente > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                O valor informado é maior que o saldo. O excedente de{' '}
                <strong>{formatCurrency(excedente)}</strong> será registrado no complemento.
              </span>
            </div>
          )}

          {valorRecebido > 0 && (
            <div
              className={`flex items-start gap-2 text-sm rounded-lg p-3 border ${
                quitaVenda
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {quitaVenda ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <span>
                {quitaVenda
                  ? 'A venda será marcada como Paga e o lançamento do saldo será baixado no Contas a Receber.'
                  : `A venda continuará Parcial, com saldo de ${formatCurrency(saldoRestante)}.`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[#6B3FA0] hover:bg-[#834CB8]"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}