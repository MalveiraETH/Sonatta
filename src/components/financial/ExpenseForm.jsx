import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';

const INSTALLABLE_METHODS = ['boleto', 'cartao_credito'];

// Safe date arithmetic without UTC conversion issues
const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ExpenseForm({ open, onOpenChange, onSuccess, expense = null }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
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
    installments: 1,
    invoice_number: '',
    notes: '',
    status: 'a_pagar'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData(expense);
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
        installments: 1,
        invoice_number: '',
        notes: '',
        status: 'a_pagar'
      });
    }
  }, [expense, open]);

  const loadData = async () => {
    try {
      const [cats, counters] = await Promise.all([
        base44.entities.ExpenseCategory.list(),
        base44.entities.Counterparty.list()
      ]);
      setCategories(cats);
      setCounterparties(counters);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const isInstallable = INSTALLABLE_METHODS.includes(formData.payment_method);

  const handlePaymentMethodChange = (value) => {
    const newIsInstallable = INSTALLABLE_METHODS.includes(value);
    setFormData({
      ...formData,
      payment_method: value,
      installments: newIsInstallable ? formData.installments : 1
    });
  };

  const handleInstallmentsChange = (e) => {
    const val = parseInt(e.target.value) || 1;
    setFormData({ ...formData, installments: Math.min(Math.max(val, 1), 24) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Informe o valor total da despesa');
      return;
    }
    if (!formData.due_date) {
      toast.error('Informe a data de vencimento');
      return;
    }
    if (!formData.category_id) {
      toast.error('Selecione uma categoria');
      return;
    }

    const installments = isInstallable ? (parseInt(formData.installments) || 1) : 1;

    if (!isInstallable && installments > 1) {
      toast.error('Este método não permite parcelamento. Use Boleto ou Crédito.');
      return;
    }

    if (isInstallable && installments > 24) {
      toast.error('Máximo de 24 parcelas');
      return;
    }

    setLoading(true);

    try {
      const category = categories.find(c => c.id === formData.category_id);
      const counterparty = counterparties.find(c => c.id === formData.counterparty_id);
      const totalAmount = parseFloat(formData.amount);

      const baseData = {
        ...formData,
        category_name: category?.name,
        counterparty_name: counterparty?.name,
        amount: totalAmount,
        installments: installments,
      };

      if (expense) {
        await base44.entities.Expense.update(expense.id, baseData);
        toast.success('Despesa atualizada!');
      } else {
        if (installments <= 1) {
          // À vista: 1 lançamento
          const status = formData.payment_date ? 'pago' : 'a_pagar';
          await base44.entities.Expense.create({
            ...baseData,
            installment_number: 1,
            installments: 1,
            status,
          });
          toast.success('Despesa cadastrada!');
        } else {
          // Parcelado: N lançamentos
          const perInstallment = Math.floor((totalAmount / installments) * 100) / 100;
          const lastAmount = Math.round((totalAmount - perInstallment * (installments - 1)) * 100) / 100;

          // Criar primeira parcela para usar como referência de grupo
          const firstRecord = await base44.entities.Expense.create({
            ...baseData,
            amount: perInstallment,
            due_date: formData.due_date,
            payment_date: '',
            installment_number: 1,
            installments: installments,
            status: 'a_pagar',
          });

          // Atualizar a primeira com parent_expense_id = ela mesma (identificador de grupo)
          await base44.entities.Expense.update(firstRecord.id, {
            parent_expense_id: firstRecord.id
          });

          // Criar parcelas 2..N
          for (let i = 2; i <= installments; i++) {
            const dueDate = addDays(formData.due_date, (i - 1) * 30);
            const isLast = i === installments;
            await base44.entities.Expense.create({
              ...baseData,
              amount: isLast ? lastAmount : perInstallment,
              due_date: dueDate,
              payment_date: '',
              installment_number: i,
              installments: installments,
              parent_expense_id: firstRecord.id,
              status: 'a_pagar',
            });
          }

          toast.success(`${installments} parcelas criadas com sucesso!`);
        }
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

  const currentMonthPT = months[new Date().getMonth()];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Mês Competência</Label>
              <Select
                value={formData.competency_month}
                onValueChange={(value) => setFormData({ ...formData, competency_month: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano Competência</Label>
              <Input
                type="number"
                value={formData.competency_year}
                onChange={(e) => setFormData({ ...formData, competency_year: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Data Evento</Label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Data Vencimento *
                {isInstallable && parseInt(formData.installments) > 1 && (
                  <span className="text-xs text-slate-500 ml-1">(parcela 1)</span>
                )}
              </Label>
              <Input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Pagamento</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label>Categoria *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fornecedor/Pessoal</Label>
            <Select
              value={formData.counterparty_id}
              onValueChange={(value) => setFormData({ ...formData, counterparty_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou crie novo..." />
              </SelectTrigger>
              <SelectContent>
                {counterparties.map(cp => (
                  <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fixo/Variável</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="variavel">Variável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={`grid gap-4 ${isInstallable ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={handlePaymentMethodChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao_credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
              {!isInstallable && (
                <p className="text-xs text-slate-500 mt-1">Pagamento à vista</p>
              )}
            </div>

            {isInstallable && (
              <div>
                <Label>Número de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.installments}
                  onChange={handleInstallmentsChange}
                />
                {parseInt(formData.installments) > 1 && formData.amount && (
                  <p className="text-xs text-slate-500 mt-1">
                    ≈ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(formData.amount) / parseInt(formData.installments))} / parcela
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Nº da Nota Fiscal ou Recibo</Label>
            <Input
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              placeholder="Ex: NF-12345, REC-001"
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Descrição, notas..."
              rows={3}
            />
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