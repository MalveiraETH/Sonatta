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
    if (expense) {
      setFormData(expense);
    }
  }, [expense]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const category = categories.find(c => c.id === formData.category_id);
      const counterparty = counterparties.find(c => c.id === formData.counterparty_id);

      const baseData = {
        ...formData,
        category_name: category?.name,
        counterparty_name: counterparty?.name,
        amount: parseFloat(formData.amount)
      };

      if (expense) {
        await base44.entities.Expense.update(expense.id, baseData);
        toast.success('Despesa atualizada!');
      } else {
        if (formData.installments > 1) {
          const installmentAmount = parseFloat((baseData.amount / formData.installments).toFixed(2));
          
          for (let i = 1; i <= formData.installments; i++) {
            const dueDate = addMonths(new Date(formData.due_date), i - 1);
            
            await base44.entities.Expense.create({
              ...baseData,
              amount: installmentAmount,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              installment_number: i,
              installments_total: formData.installments,
              status: 'a_pagar'
            });
          }
        } else {
          // Para não parceladas: se tem data de pagamento, status é "pago"
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
              <Label>Data Vencimento *</Label>
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
              required
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={formData.installments}
                onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
              />
            </div>
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