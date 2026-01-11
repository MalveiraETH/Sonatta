import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CreditCard, Smartphone } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AccountsReceivable() {
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Installment.list('-due_date');
      setInstallments(data);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
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
      case 'parcialmente_pago': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const updateInstallmentStatus = (installment) => {
    if (installment.payment_status === 'pago') return 'pago';
    if (installment.paid_amount > 0) return 'parcialmente_pago';
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    if (isBefore(dueDate, today)) return 'atrasado';
    return 'pendente';
  };

  const filteredInstallments = installments.filter(inst => {
    const status = updateInstallmentStatus(inst);
    const matchesFilter = filter === 'todos' || 
                          (filter === 'pix' && inst.payment_method === 'pix_parcelado') ||
                          (filter === 'cartao' && inst.payment_method === 'cartao_credito') ||
                          status === filter;
    const matchesSearch = inst.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pixInstallments = installments.filter(i => i.payment_method === 'pix_parcelado');
  const cardInstallments = installments.filter(i => i.payment_method === 'cartao_credito');
  const totalReceivable = installments.reduce((sum, i) => sum + (i.remaining_amount || 0), 0);
  const totalReceived = installments.reduce((sum, i) => sum + (i.paid_amount || 0), 0);

  const handlePayInstallment = async () => {
    if (!paymentDialog || !paymentAmount) return;
    
    try {
      const amount = parseFloat(paymentAmount);
      const newPaidAmount = paymentDialog.paid_amount + amount;
      const newRemainingAmount = paymentDialog.original_amount - newPaidAmount;
      
      const paymentHistory = paymentDialog.payment_history || [];
      paymentHistory.push({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: amount,
        note: ''
      });

      await base44.entities.Installment.update(paymentDialog.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        payment_status: newRemainingAmount <= 0 ? 'pago' : 'parcialmente_pago',
        last_payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_history: paymentHistory
      });

      setPaymentDialog(null);
      setPaymentAmount('');
      loadInstallments();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        description="Gerencie parcelas de vendas"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivable)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">PIX Parcelado</CardTitle>
            <Smartphone className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pixInstallments.length}</div>
            <p className="text-xs text-slate-500">parcelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cartão Crédito</CardTitle>
            <CreditCard className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardInstallments.length}</div>
            <p className="text-xs text-slate-500">parcelas</p>
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
                <SelectItem value="pix">PIX Parcelado</SelectItem>
                <SelectItem value="cartao">Cartão Crédito</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredInstallments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma parcela encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInstallments.map((installment) => {
                const status = updateInstallmentStatus(installment);
                return (
                  <div
                    key={installment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{installment.client_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                          {status === 'pendente' ? 'Pendente' : 
                           status === 'atrasado' ? 'Atrasado' :
                           status === 'parcialmente_pago' ? 'Parcial' : 'Pago'}
                        </span>
                        {installment.payment_method === 'pix_parcelado' ? (
                          <Smartphone className="h-4 w-4 text-purple-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        Parcela {installment.installment_number} • 
                        Vencimento: {format(new Date(installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(installment.remaining_amount)}</div>
                        {installment.paid_amount > 0 && (
                          <div className="text-xs text-slate-500">
                            Pago: {formatCurrency(installment.paid_amount)}
                          </div>
                        )}
                      </div>
                      {status !== 'pago' && (
                        <Button
                          onClick={() => {
                            setPaymentDialog(installment);
                            setPaymentAmount(installment.remaining_amount.toString());
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

      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cliente</label>
              <p className="text-lg">{paymentDialog?.client_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Valor a Pagar</label>
              <p className="text-xl font-bold">{formatCurrency(paymentDialog?.remaining_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Valor do Pagamento</label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handlePayInstallment} className="bg-emerald-600 hover:bg-emerald-700">
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}