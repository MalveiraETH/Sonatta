import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isAfter, isBefore, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, AlertTriangle, Clock, CheckCircle2, Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import ExpenseForm from '../components/financial/ExpenseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AccountsPayable() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Expense.list('-due_date');
      setExpenses(data);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago': return 'bg-emerald-100 text-emerald-700';
      case 'atrasado': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const updateExpenseStatus = (expense) => {
    const today = new Date();
    const dueDate = new Date(expense.due_date);
    
    if (expense.status === 'pago') return 'pago';
    if (isBefore(dueDate, today)) return 'atrasado';
    return 'a_pagar';
  };

  const filteredExpenses = expenses.filter(expense => {
    const status = updateExpenseStatus(expense);
    const matchesFilter = filter === 'todos' || status === filter;
    const matchesSearch = expense.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.counterparty_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toPay = expenses.filter(e => updateExpenseStatus(e) === 'a_pagar').reduce((sum, e) => sum + e.amount, 0);
  const overdue = expenses.filter(e => updateExpenseStatus(e) === 'atrasado').reduce((sum, e) => sum + e.amount, 0);
  const dueSoon = expenses.filter(e => {
    const status = updateExpenseStatus(e);
    const dueDate = new Date(e.due_date);
    const in7Days = addDays(new Date(), 7);
    return status === 'a_pagar' && isBefore(dueDate, in7Days);
  }).length;
  const paid = expenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + e.amount, 0);

  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [additionalFees, setAdditionalFees] = useState('');
  const [feeDescription, setFeeDescription] = useState('');

  const handlePayExpense = async () => {
    if (!paymentDialog) return;
    
    try {
      const baseAmount = paymentDialog.amount;
      const fees = parseFloat(additionalFees) || 0;
      const totalAmount = baseAmount + fees;
      
      await base44.entities.Expense.update(paymentDialog.id, {
        status: 'pago',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        amount: totalAmount,
        notes: feeDescription ? `${paymentDialog.notes || ''}\n${feeDescription}`.trim() : paymentDialog.notes
      });
      
      setPaymentDialog(null);
      setPaymentAmount('');
      setAdditionalFees('');
      setFeeDescription('');
      loadExpenses();
    } catch (error) {
      console.error('Erro ao dar baixa:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        description="Acompanhe despesas e vencimentos"
        action={() => setShowForm(true)}
        actionLabel="Nova Despesa"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(toPay)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overdue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vence em 7 dias</CardTitle>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueSoon}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paid)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="a_pagar">A Pagar</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por categoria ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma despesa encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => {
                const status = updateExpenseStatus(expense);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{expense.category_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                          {status === 'a_pagar' ? 'A Pagar' : status === 'atrasado' ? 'Atrasado' : 'Pago'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {expense.counterparty_name && <span>{expense.counterparty_name} • </span>}
                        Vencimento: {format(new Date(expense.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        {expense.installment_number && <span> • Parcela {expense.installment_number}/{expense.installments}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(expense.amount)}</div>
                      </div>
                      {status !== 'pago' && (
                        <Button
                          onClick={() => {
                            setPaymentDialog(expense);
                            setPaymentAmount(expense.amount.toString());
                            setAdditionalFees('');
                            setFeeDescription('');
                          }}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Dar Baixa
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ExpenseForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadExpenses();
          }}
        />
      )}

      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <p className="text-lg">{paymentDialog?.category_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Valor Original</label>
              <p className="text-xl font-bold">{formatCurrency(paymentDialog?.amount)}</p>
            </div>
            {paymentDialog && new Date(paymentDialog.due_date) < new Date() && (
              <>
                <div>
                  <label className="text-sm font-medium">Juros/Multas</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={additionalFees}
                    onChange={(e) => setAdditionalFees(e.target.value)}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Adicionar valor de juros ou multas por atraso
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição dos Juros/Multas</label>
                  <Input
                    value={feeDescription}
                    onChange={(e) => setFeeDescription(e.target.value)}
                    placeholder="Ex: Juros 2% + Multa R$ 10,00"
                  />
                </div>
              </>
            )}
            {additionalFees && parseFloat(additionalFees) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">Total a Pagar</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatCurrency((paymentDialog?.amount || 0) + parseFloat(additionalFees))}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handlePayExpense} className="bg-emerald-600 hover:bg-emerald-700">
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}