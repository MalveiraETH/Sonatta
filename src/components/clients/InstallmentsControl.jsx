import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import InstallmentsPDFButton from '@/components/clients/InstallmentsPDFButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function InstallmentsControl({ clientId, clientName, clientPhone, paymentMethod = 'pix_parcelado', onUpdate }) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    loadInstallments();
  }, [clientId, paymentMethod]);

  const loadInstallments = async () => {
    try {
      const data = await base44.entities.Installment.filter({ client_id: clientId, payment_method: paymentMethod }, 'due_date');
      setInstallments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (installment) => {
    setSelectedInstallment(installment);
    setPaymentAmount(installment.remaining_amount.toString());
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (submitting) return;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedInstallment.remaining_amount) {
      toast.error('Valor maior que o saldo devedor');
      return;
    }

    setSubmitting(true);
    try {
      const newPaidAmount = selectedInstallment.paid_amount + amount;
      const newRemainingAmount = selectedInstallment.original_amount - newPaidAmount;
      
      const paymentHistory = selectedInstallment.payment_history || [];
      paymentHistory.push({
        date: paymentDate,
        amount: amount,
        note: `Pagamento registrado`
      });

      const newStatus = newRemainingAmount <= 0.01 ? 'pago' : 'parcialmente_pago';

      await base44.entities.Installment.update(selectedInstallment.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        payment_status: newStatus,
        last_payment_date: paymentDate,
        payment_history: paymentHistory
      });

      toast.success('Pagamento registrado com sucesso!');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      await loadInstallments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppReminder = (installment) => {
    if (!clientPhone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    const phone = clientPhone.replace(/\D/g, '');
    const dueDate = format(new Date(installment.due_date), "dd/MM/yyyy", { locale: ptBR });
    const paymentType = paymentMethod === 'pix_parcelado' ? 'PIX' : 'Cartão de Crédito';
    const message = `Olá ${clientName}! 

Este é um lembrete sobre a parcela ${installment.installment_number} da venda ${installment.sale_number}.

📅 Vencimento: ${dueDate}
💰 Valor: ${formatCurrency(installment.remaining_amount)}

Aguardamos seu pagamento via ${paymentType}. Em caso de dúvidas, estamos à disposição!

Obrigado,
Sonatta Soluções Auditivas`;

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pago':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'parcialmente_pago':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'atrasado':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago':
        return 'bg-emerald-50 border-emerald-200';
      case 'parcialmente_pago':
        return 'bg-amber-50 border-amber-200';
      case 'atrasado':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const pendingInstallments = installments.filter(i => i.payment_status !== 'pago');
  const totalPending = pendingInstallments.reduce((sum, i) => sum + i.remaining_amount, 0);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0] mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle>
                {paymentMethod === 'pix_parcelado' ? 'Controle de Parcelas PIX' : 'Controle de Parcelas Cartão'}
              </CardTitle>
              <InstallmentsPDFButton
                installments={installments}
                clientName={clientName}
                paymentMethod={paymentMethod}
              />
            </div>
            {totalPending > 0 && (
              <div className="text-right">
                <p className="text-sm text-slate-500">Saldo Total Devedor</p>
                <p className="text-2xl font-bold text-[#6B3FA0]">{formatCurrency(totalPending)}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {installments.length > 0 ? (
            <div className="space-y-3">
              {installments.map((installment) => {
                const isOverdue = new Date(installment.due_date) < new Date() && installment.payment_status !== 'pago';
                const actualStatus = isOverdue && installment.payment_status === 'pendente' ? 'atrasado' : installment.payment_status;
                
                return (
                  <div
                    key={installment.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(actualStatus)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(actualStatus)}
                        <div>
                          <h4 className="font-semibold text-slate-800">
                            Parcela {installment.installment_number} - {installment.sale_number}
                          </h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Vencimento: {format(new Date(installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {installment.payment_status !== 'pago' && paymentMethod === 'pix_parcelado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendWhatsAppReminder(installment)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Cobrar
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Valor Original:</span>
                        <p className="font-medium">{formatCurrency(installment.original_amount)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Valor Pago:</span>
                        <p className="font-medium text-emerald-600">{formatCurrency(installment.paid_amount)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Saldo Devedor:</span>
                        <p className="font-bold text-[#6B3FA0]">{formatCurrency(installment.remaining_amount)}</p>
                      </div>
                      <div>
                        {installment.payment_status !== 'pago' ? (
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(installment)}
                            className="w-full bg-[#A4D233] hover:bg-[#B8E047] text-slate-900"
                          >
                            Dar Baixa
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Quitado
                          </span>
                        )}
                      </div>
                    </div>

                    {installment.payment_history && installment.payment_history.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-500 mb-2">Histórico de Pagamentos:</p>
                        <div className="space-y-1">
                          {installment.payment_history.map((payment, idx) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded flex items-center justify-between">
                              <span className="text-slate-600">
                                {format(new Date(payment.date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              <span className="font-medium text-emerald-600">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Nenhuma parcela pendente</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedInstallment && (
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Parcela {selectedInstallment.installment_number}</p>
                <p className="font-semibold">{selectedInstallment.sale_number}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Saldo devedor: <span className="font-bold text-[#6B3FA0]">{formatCurrency(selectedInstallment.remaining_amount)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Valor Pago *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    setPaymentAmount(value);
                  }}
                  placeholder="0.00"
                />
                <p className="text-xs text-slate-500">
                  O valor pode ser menor que o total da parcela
                </p>
              </div>

              <div className="space-y-2">
                <Label>Data do Pagamento *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handlePayment} disabled={submitting} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
                  {submitting ? 'Salvando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}