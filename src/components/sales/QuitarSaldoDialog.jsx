import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import CurrencyInput from '@/components/ui/CurrencyInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logCreation } from '@/components/utils/auditLogger';
import { recalculateClientStatus } from '@/components/utils/clientStatusSync';
import { createInstallmentsForSale } from '@/components/sales/syncInstallments';
import {
  PAYMENT_METHOD_LABELS,
  calcPaymentFees,
  getAggregatedBrands,
  findBrandConfig,
  isInstallmentMethod
} from '@/components/sales/paymentFees';

export default function QuitarSaldoDialog({ open, onOpenChange, sale, onSuccess }) {
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [amount, setAmount] = useState(0);
  const [payDate, setPayDate] = useState('');
  const [method, setMethod] = useState('pix');
  const [cardBrand, setCardBrand] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstDue, setFirstDue] = useState('');
  const [saving, setSaving] = useState(false);

  const saldo = Number(sale?.pending_balance) || 0;
  const valor = Number(amount) || 0;
  const excedente = valor > saldo + 0.01;

  useEffect(() => {
    if (!open || !sale) return;
    setAmount(saldo);
    setPayDate(format(new Date(), 'yyyy-MM-dd'));
    setMethod('pix');
    setCardBrand('');
    setInstallments(1);
    setFirstDue('');
    (async () => {
      try {
        setPaymentTypes(await base44.entities.PaymentType.filter({ status: 'ativo' }));
      } catch (e) {
        console.warn('Formas de pagamento indisponíveis');
      }
      try {
        setCurrentUser(await base44.auth.me());
      } catch (e) {
        console.warn('Usuário não identificado');
      }
    })();
  }, [open, sale]);

  if (!sale) return null;

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(v || 0);

  const availableMethods = paymentTypes.length > 0
    ? paymentTypes.map(pt => pt.type)
    : ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'];

  const brands = (method === 'cartao_debito' || method === 'cartao_credito')
    ? getAggregatedBrands(paymentTypes, method)
    : [];

  const installmentOptions = (() => {
    if (method === 'cartao_credito') {
      const brand = findBrandConfig(paymentTypes, method, cardBrand);
      const list = (brand?.installment_rates || []).map(ir => Number(ir.installments)).sort((a, b) => a - b);
      if (list.length > 0) return list;
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  })();

  const { enriched, totalFeeAmount } = calcPaymentFees(paymentTypes, [
    { method, amount: valor, installments, card_brand: cardBrand }
  ]);
  const preview = enriched[0] || { fee_rate: 0 };
  const quitacaoTotal = valor >= saldo - 0.01;

  const handleSubmit = async () => {
    if (valor <= 0) {
      toast.error('Informe o valor recebido');
      return;
    }
    if (!payDate) {
      toast.error('Informe a data do recebimento');
      return;
    }
    if ((method === 'cartao_debito' || method === 'cartao_credito') && !cardBrand) {
      toast.error('Selecione a bandeira do cartão');
      return;
    }

    setSaving(true);
    try {
      const parcelado = isInstallmentMethod(method);
      const saleNumber = `VND-${payDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      const compSale = await base44.entities.Sale.create({
        client_id: sale.client_id,
        client_name: sale.client_name,
        client_cpf: sale.client_cpf || '',
        client_phone: sale.client_phone || '',
        client_email: sale.client_email || '',
        client_address: sale.client_address || '',
        items: [],
        subtotal: valor,
        discount: 0,
        total: valor,
        total_fee_amount: totalFeeAmount,
        total_net_amount: Number((valor - totalFeeAmount).toFixed(2)),
        payment_details: enriched,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        sale_number: saleNumber,
        sale_date: payDate,
        status: parcelado ? 'pendente' : 'pago',
        is_complementary: true,
        complementary_to_sale_id: sale.id,
        complementary_to_sale_number: sale.sale_number,
        notes: `Quitação de saldo da venda ${sale.sale_number}`
      });

      await logCreation('Venda', `${saleNumber} - Quitação de saldo - ${sale.client_name}`, compSale.id);

      // Só cartão de crédito e PIX parcelado entram no Contas a Receber
      if (parcelado) {
        await createInstallmentsForSale(compSale, payDate, firstDue ? new Date(firstDue + 'T12:00:00') : null);
      }

      // Remove lançamento legado de "saldo pendente" desta venda
      try {
        const leftovers = await base44.entities.Installment.filter({ sale_id: sale.id, payment_method: 'saldo_pendente' });
        for (const inst of leftovers) {
          await base44.entities.Installment.delete(inst.id);
        }
      } catch (e) {
        console.warn('Aviso: não foi possível remover o lançamento de saldo pendente:', e.message);
      }

      // Atualiza a venda original
      const restante = Math.max(0, Math.round((saldo - valor) * 100) / 100);
      await base44.entities.Sale.update(sale.id, restante <= 0.01
        ? { pending_balance: 0, pending_due_date: null, status: 'pago' }
        : { pending_balance: restante, status: 'parcial' });

      try {
        await recalculateClientStatus(sale.client_id);
      } catch (e) {
        console.warn(e);
      }

      toast.success(restante <= 0.01
        ? 'Saldo quitado! Venda marcada como Paga.'
        : `Recebimento registrado. Saldo restante: ${formatCurrency(restante)}`);
      onOpenChange(false);
      if (onSuccess) await onSuccess();
    } catch (error) {
      console.error('Erro na quitação:', error);
      toast.error('Erro ao registrar a quitação do saldo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-[#6B3FA0]" />
            Quitar Saldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card className="p-3 bg-purple-50 border-purple-200 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-medium">{sale.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Venda:</span>
              <span className="font-medium">{sale.sale_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valor da venda:</span>
              <span className="font-medium">{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recebido:</span>
              <span className="font-medium text-emerald-700">{formatCurrency(Math.round(((sale.total || 0) - saldo) * 100) / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Falta:</span>
              <span className="font-bold text-amber-600">{formatCurrency(saldo)}</span>
            </div>
          </Card>

          <div>
            <Label>Valor recebido (R$) *</Label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>

          <div>
            <Label>Data do recebimento *</Label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>

          <div>
            <Label>Forma de pagamento *</Label>
            <Select value={method} onValueChange={(value) => { setMethod(value); setCardBrand(''); setInstallments(1); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.map(m => (
                  <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m] || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(method === 'cartao_debito' || method === 'cartao_credito') && (
            <div>
              <Label>Bandeira *</Label>
              <Select value={cardBrand} onValueChange={setCardBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a bandeira..." />
                </SelectTrigger>
                <SelectContent>
                  {brands.length === 0 ? (
                    <SelectItem value="__none__" disabled>Nenhuma bandeira cadastrada</SelectItem>
                  ) : (
                    brands.map(b => <SelectItem key={b.brand} value={b.brand}>{b.brand}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {(method === 'cartao_credito' || method === 'pix_parcelado') && (
            <div>
              <Label>Parcelas</Label>
              <Select value={String(installments)} onValueChange={(value) => setInstallments(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x{n > 1 ? ` de ${formatCurrency(valor / n)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {method === 'pix_parcelado' && installments > 1 && (
            <div>
              <Label>Data do 1º vencimento</Label>
              <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
          )}

          {isInstallmentMethod(method) ? (
            <p className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
              Vai para o Contas a Receber em {installments}x.
              {preview.fee_rate > 0 && ` Taxa ${preview.fee_rate}% (${formatCurrency(preview.fee_amount)}) → líquido: ${formatCurrency(preview.net_amount)}.`}
            </p>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
              Esta forma de pagamento não gera lançamento no Contas a Receber.
            </p>
          )}

          {excedente && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
              Valor acima do saldo de {formatCurrency(saldo)}. O excedente de {formatCurrency(valor - saldo)} será registrado como recebimento extra.
            </p>
          )}

          <p className="text-sm font-medium text-slate-700">
            {quitacaoTotal
              ? 'A venda será marcada como Paga.'
              : `A venda continuará Parcial, com saldo de ${formatCurrency(saldo - valor)}.`}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Quitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}