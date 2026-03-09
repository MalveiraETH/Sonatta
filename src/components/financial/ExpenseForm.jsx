import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';

export default function ExpenseForm({ open, onOpenChange, onSuccess, expense = null }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [formData, setFormData] = useState({
    competency_month: format(new Date(), 'MMMM'),
    competency_year: new Date().getFullYear(),
    event_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    payment_date: '',
    amount: '',
    category_id: '',
    counterparty_id: '',
    type: 'variavel',
    payment_method: 'pix',
    card_brand: '',
    fee_rate: 0,
    fee_amount: 0,
    installments: 1,
    invoice_number: '',
    notes: '',
    status: 'a_pagar'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (open) {
      if (expense) {
        setFormData({ ...expense });
      } else {
        setFormData({
          competency_month: format(new Date(), 'MMMM'),
          competency_year: new Date().getFullYear(),
          event_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: format(new Date(), 'yyyy-MM-dd'),
          payment_date: '',
          amount: '',
          category_id: '',
          counterparty_id: '',
          type: 'variavel',
          payment_method: 'pix',
          card_brand: '',
          fee_rate: 0,
          fee_amount: 0,
          installments: 1,
          invoice_number: '',
          notes: '',
          status: 'a_pagar'
        });
      }
    }
  }, [open, expense]);

  const loadData = async () => {
    try {
      const [cats, counters, pts] = await Promise.all([
        base44.entities.ExpenseCategory.list(),
        base44.entities.Counterparty.list(),
        base44.entities.PaymentType.list()
      ]);
      setCategories(cats);
      setCounterparties(counters);
      setPaymentTypes(pts);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  // ---- Helpers de bandeira/taxa (mesma lógica do NewSaleForm) ----
  const getAggregatedBrands = (method) => {
    const records = paymentTypes.filter(pt => pt.type === method);
    const allBrands = [];
    const seen = new Set();
    for (const pt of records) {
      for (const b of (pt.card_brands || [])) {
        if (b.brand && !seen.has(b.brand)) {
          seen.add(b.brand);
          allBrands.push(b);
        }
      }
    }
    return allBrands;
  };

  const findBrandConfig = (method, brand) => {
    for (const pt of paymentTypes.filter(p => p.type === method)) {
      const found = (pt.card_brands || []).find(b => b.brand === brand);
      if (found) return found;
    }
    return null;
  };

  const getCreditRate = (brand, installments) => {
    if (!brand) return 0;
    const brandData = findBrandConfig('cartao_credito', brand);
    if (!brandData) return 0;
    const ir = (brandData.installment_rates || []).find(r => Number(r.installments) === Number(installments));
    return ir ? Number(ir.rate) : 0;
  };

  const getDebitRate = (brand) => {
    if (!brand) return 0;
    const brandData = findBrandConfig('cartao_debito', brand);
    return brandData ? Number(brandData.rate) : 0;
  };

  // Lista de métodos disponíveis (do cadastro PaymentType)
  const paymentMethodLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX à Vista',
    pix_parcelado: 'PIX Parcelado',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
  };
  const availableMethods = paymentTypes.length > 0
    ? Object.fromEntries(paymentTypes.map(pt => [pt.type, paymentMethodLabels[pt.type] || pt.type]))
    : paymentMethodLabels;

  const handleMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method,
      card_brand: '',
      fee_rate: 0,
      fee_amount: 0,
      installments: 1
    }));
  };

  const handleBrandChange = (brand) => {
    const method = formData.payment_method;
    let feeRate = 0;
    if (method === 'cartao_debito') feeRate = getDebitRate(brand);
    else if (method === 'cartao_credito') feeRate = getCreditRate(brand, formData.installments);
    const amount = parseFloat(formData.amount) || 0;
    const feeAmount = Math.round(amount * feeRate / 100 * 100) / 100;
    setFormData(prev => ({ ...prev, card_brand: brand, fee_rate: feeRate, fee_amount: feeAmount }));
  };

  const handleInstallmentsChange = (installments) => {
    const n = Number(installments);
    let feeRate = 0;
    if (formData.payment_method === 'cartao_credito') feeRate = getCreditRate(formData.card_brand, n);
    const amount = parseFloat(formData.amount) || 0;
    const feeAmount = Math.round(amount * feeRate / 100 * 100) / 100;
    setFormData(prev => ({ ...prev, installments: n, fee_rate: feeRate, fee_amount: feeAmount }));
  };

  const isInstallable = formData.payment_method === 'pix_parcelado' || formData.payment_method === 'cartao_credito';
  const isCard = formData.payment_method === 'cartao_debito' || formData.payment_method === 'cartao_credito';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const category = categories.find(c => c.id === formData.category_id);
      const counterparty = counterparties.find(c => c.id === formData.counterparty_id);
      const amount = parseFloat(formData.amount);
      const feeAmount = Math.round(amount * (formData.fee_rate || 0) / 100 * 100) / 100;

      const baseData = {
        ...formData,
        category_name: category?.name,
        counterparty_name: counterparty?.name,
        amount,
        fee_amount: feeAmount
      };

      if (expense) {
        await base44.entities.Expense.update(expense.id, baseData);
        toast.success('Despesa atualizada!');
      } else {
        const numInstallments = formData.installments > 1 && isInstallable ? formData.installments : 1;

        if (numInstallments > 1) {
          const parentExpense = await base44.entities.Expense.create({ ...baseData, installments: numInstallments });
          const installmentAmount = Math.round((amount / numInstallments) * 100) / 100;

          for (let i = 1; i <= numInstallments; i++) {
            const dueDate = addMonths(new Date(formData.due_date), i - 1);
            await base44.entities.Expense.create({
              ...baseData,
              amount: installmentAmount,
              fee_amount: Math.round(installmentAmount * (formData.fee_rate || 0) / 100 * 100) / 100,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              installment_number: i,
              installments: numInstallments,
              parent_expense_id: parentExpense.id,
              status: 'a_pagar',
              payment_date: ''
            });
          }
        } else {
          if (formData.payment_date) {
            baseData.status = 'pago';
          }
          await base44.entities.Expense.create(baseData);
        }
        toast.success('Despesa cadastrada!');
      }

      if (onSuccess) onSuccess();
      if (onOpenChange) onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast.error('Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Competência */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Mês Competência</Label>
              <Select value={formData.competency_month} onValueChange={(v) => setFormData({ ...formData, competency_month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano Competência</Label>
              <Input type="number" value={formData.competency_year} onChange={(e) => setFormData({ ...formData, competency_year: parseInt(e.target.value) })} />
            </div>
            <div>
              <Label>Data Evento</Label>
              <Input type="date" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Vencimento *</Label>
              <Input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Data Pagamento</Label>
              <Input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
            </div>
          </div>

          {/* Valor */}
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0,00" />
          </div>

          {/* Categoria */}
          <div>
            <Label>Categoria *</Label>
            <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })} required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div>
            <Label>Fornecedor/Pessoal</Label>
            <Select value={formData.counterparty_id} onValueChange={(v) => setFormData({ ...formData, counterparty_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {counterparties.map(cp => <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Fixo/Variável */}
          <div>
            <Label>Fixo/Variável</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="variavel">Variável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
            <Label className="text-sm font-semibold text-slate-700">Forma de Pagamento</Label>

            {/* Método */}
            <div>
              <Label className="text-xs">Método</Label>
              <Select value={formData.payment_method} onValueChange={handleMethodChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(availableMethods).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bandeira (cartão débito/crédito) */}
            {isCard && (() => {
              const brands = getAggregatedBrands(formData.payment_method);
              const allOptions = formData.card_brand && !brands.find(b => b.brand === formData.card_brand)
                ? [{ brand: formData.card_brand }, ...brands]
                : brands;
              return (
                <div>
                  <Label className="text-xs">Bandeira</Label>
                  <Select value={formData.card_brand || ''} onValueChange={handleBrandChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione a bandeira..." /></SelectTrigger>
                    <SelectContent>
                      {allOptions.map(b => <SelectItem key={b.brand} value={b.brand}>{b.brand}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            {/* Parcelas (pix_parcelado ou cartao_credito) */}
            {isInstallable && (
              <div>
                <Label className="text-xs">Quantidade de Parcelas</Label>
                <Select value={String(formData.installments || 1)} onValueChange={handleInstallmentsChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      if (formData.payment_method === 'cartao_credito' && formData.card_brand) {
                        const brand = findBrandConfig('cartao_credito', formData.card_brand);
                        const available = brand
                          ? (brand.installment_rates || []).map(ir => Number(ir.installments)).sort((a, b) => a - b)
                          : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                        return available.map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>);
                      }
                      return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Info de taxa */}
            {formData.payment_method === 'cartao_debito' && formData.card_brand && formData.fee_rate > 0 && (
              <p className="text-xs text-slate-500 bg-amber-50 px-2 py-1 rounded">
                Taxa {formData.card_brand}: {formData.fee_rate}%
              </p>
            )}
            {formData.payment_method === 'cartao_credito' && formData.card_brand && formData.fee_rate > 0 && (
              <p className="text-xs text-slate-500 bg-amber-50 px-2 py-1 rounded">
                Taxa {formData.installments}x {formData.card_brand}: {formData.fee_rate}%
              </p>
            )}

            {/* Resumo parcelamento */}
            {isInstallable && formData.installments > 1 && formData.amount && (
              <div className="bg-blue-50 rounded px-3 py-2 text-xs text-slate-600">
                {formData.installments}x de {formatCurrency(parseFloat(formData.amount) / formData.installments)} — vencimentos mensais a partir de {formData.due_date}
              </div>
            )}
          </div>

          {/* Nota Fiscal */}
          <div>
            <Label>Nº da Nota Fiscal ou Recibo</Label>
            <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="Ex: NF-12345, REC-001" />
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Descrição, notas..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading ? 'Salvando...' : expense ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}