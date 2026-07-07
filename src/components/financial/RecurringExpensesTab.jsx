import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RotateCw, Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RecurringExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_day: 1,
    category_id: '',
    counterparty_id: '',
    type: 'fixo',
    payment_method: 'pix',
    invoice_number: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exp, cats, counters] = await Promise.all([
        base44.entities.RecurringExpense.list(),
        base44.entities.ExpenseCategory.list(),
        base44.entities.Counterparty.list()
      ]);
      setExpenses(exp);
      setCategories(cats);
      setCounterparties(counters);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const [generating, setGenerating] = useState(false);

  const generateMonthlyExpenses = async () => {
    const activeExpenses = expenses.filter(e => e.is_active !== false);
    if (activeExpenses.length === 0) {
      toast.error('Nenhuma despesa recorrente ativa cadastrada');
      return;
    }

    setGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      const competencyMonth = monthNames[month];

      // Busca lançamentos já existentes para este mês
      const existingExpenses = await base44.entities.Expense.filter({
        competency_month: competencyMonth,
        competency_year: year
      });
      const existingRecurringIds = new Set(existingExpenses.map(e => e.recurring_expense_id).filter(Boolean));

      const toCreate = activeExpenses.filter(e => !existingRecurringIds.has(e.id));

      if (toCreate.length === 0) {
        toast.info(`Todos os lançamentos de ${competencyMonth}/${year} já foram gerados`);
        return;
      }

      for (const rec of toCreate) {
        const day = Math.min(rec.due_day, new Date(year, month + 1, 0).getDate());
        const dueDate = format(new Date(year, month, day), 'yyyy-MM-dd');

        await base44.entities.Expense.create({
          competency_month: competencyMonth,
          competency_year: year,
          due_date: dueDate,
          event_date: dueDate,
          amount: rec.amount,
          category_id: rec.category_id,
          category_name: rec.category_name,
          counterparty_id: rec.counterparty_id,
          counterparty_name: rec.counterparty_name,
          type: rec.type,
          payment_method: rec.payment_method,
          invoice_number: rec.invoice_number,
          notes: rec.notes,
          status: 'a_pagar',
          recurring_expense_id: rec.id
        });
      }

      toast.success(`${toCreate.length} lançamento(s) gerado(s) em Contas a Pagar!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar lançamentos');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const category = categories.find(c => c.id === formData.category_id);
      const counterparty = counterparties.find(c => c.id === formData.counterparty_id);
      
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_day: parseInt(formData.due_day),
        category_name: category?.name,
        counterparty_name: counterparty?.name
      };
      
      if (editing) {
        await base44.entities.RecurringExpense.update(editing.id, data);
        toast.success('Despesa recorrente atualizada!');
      } else {
        await base44.entities.RecurringExpense.create(data);
        toast.success('Despesa recorrente cadastrada!');
      }
      
      setShowForm(false);
      setEditing(null);
      setFormData({
        name: '',
        amount: '',
        due_day: 1,
        category_id: '',
        counterparty_id: '',
        type: 'fixo',
        payment_method: 'pix',
        invoice_number: '',
        notes: '',
        is_active: true
      });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar despesa recorrente:', error);
      toast.error('Erro ao salvar despesa recorrente');
    }
  };

  const handleEdit = (expense) => {
    setEditing(expense);
    setFormData(expense);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir esta despesa recorrente?')) return;
    try {
      await base44.entities.RecurringExpense.delete(id);
      toast.success('Despesa recorrente excluída!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir despesa recorrente:', error);
      toast.error('Erro ao excluir despesa recorrente');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Despesas Recorrentes</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Lançamentos automáticos todo dia 1º do mês</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateMonthlyExpenses} disabled={generating}>
              <Zap className="h-4 w-4 mr-2" />
              {generating ? 'Gerando...' : 'Gerar lançamentos do mês'}
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa Recorrente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <RotateCw className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma despesa recorrente cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(expense => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <RotateCw className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{expense.name}</span>
                        {!expense.is_active && (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        {expense.category_name} • 
                        Dia {expense.due_day} • 
                        {formatCurrency(expense.amount)}
                        {expense.counterparty_name && ` • ${expense.counterparty_name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Despesa Recorrente' : 'Nova Despesa Recorrente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aluguel, Internet, Salário..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Dia do Vencimento *</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                />
              </div>
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
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map(cp => (
                    <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
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
                placeholder="Observações..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                {editing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}