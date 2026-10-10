import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import CurrencyInput from '@/components/ui/CurrencyInput';
import { toast } from 'sonner';
import { periodLabel } from '@/components/rentals/RentalChargesList';

const paymentMethods = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito'
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

/**
 * Registra o recebimento de uma cobrança de locação.
 */
export default function RentalChargePaymentDialog({ open, onOpenChange, charge, onPaid }) {
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [method, setMethod] = useState('pix');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && charge) {
      setAmount(charge.remaining_amount || charge.amount || 0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setMethod(charge.payment_method || 'pix');
    }
  }, [open, charge]);

  const handleSubmit = async () => {
    if (!paymentDate) {
      toast.error('Informe a data do recebimento');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (Number(amount) > (charge.remaining_amount || 0)) {
      toast.error('Valor maior que o saldo da cobrança');
      return;
    }

    setSaving(true);
    try {
      const paid = (charge.paid_amount || 0) + Number(amount);
      const remaining = (charge.remaining_amount || 0) - Number(amount);
      await base44.entities.RentalCharge.update(charge.id, {
        paid_amount: paid,
        remaining_amount: remaining,
        status: remaining <= 0 ? 'pago' : 'parcial',
        payment_date: paymentDate,
        payment_method: method,
        payment_history: [
          ...(charge.payment_history || []),
          { date: paymentDate, amount: Number(amount), note: 'Recebimento de locação' }
        ]
      });
      toast.success('Recebimento registrado!');
      onOpenChange(false);
      onPaid?.();
    } catch (error) {
      toast.error('Erro ao registrar recebimento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receber Cobrança de Locação</DialogTitle>
        </DialogHeader>

        {charge && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-medium">{charge.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Locação / Período:</span>
                <span className="font-medium">
                  {charge.rental_number || '-'} · {periodLabel(charge.period)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo:</span>
                <span className="font-bold">{formatCurrency(charge.remaining_amount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data do Recebimento *</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Valor Recebido (R$) *</Label>
              <CurrencyInput value={amount} onChange={(val) => setAmount(val)} />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethods).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-slate-600">Novo saldo:</span>
              <span className="font-bold">
                {formatCurrency(Math.max((charge.remaining_amount || 0) - Number(amount || 0), 0))}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Registrando...' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}