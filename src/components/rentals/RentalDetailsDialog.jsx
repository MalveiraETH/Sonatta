import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import RentalChargesList from '@/components/rentals/RentalChargesList';
import RentalChargePaymentDialog from '@/components/rentals/RentalChargePaymentDialog';
import { RefreshCw, Pencil, StopCircle, Repeat } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const statusStyles = {
  ativa: 'bg-emerald-100 text-emerald-700',
  encerrada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-100 text-red-700'
};

const statusLabels = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada'
};

const formatDate = (value) => (value ? formatLocalDate(value) : '—');

/**
 * Detalhes da locação com as cobranças mensais e as ações do ciclo de vida.
 */
export default function RentalDetailsDialog({ open, onOpenChange, rental, onChanged, onEditRental, onEndRental }) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (open && rental?.id) loadCharges();
  }, [open, rental?.id]);

  const loadCharges = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.RentalCharge.filter(
        { rental_id: rental.id },
        { sort: 'due_date', limit: 200 }
      );
      setCharges(page.items || []);
    } catch (error) {
      toast.error('Erro ao carregar cobranças');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('gerarCobrancasLocacao', { rental_id: rental.id });
      const created = res?.data?.created ?? 0;
      toast.success(created > 0 ? `${created} cobrança(s) gerada(s)` : 'Nenhuma cobrança nova');
      await loadCharges();
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Erro ao gerar cobranças');
    } finally {
      setGenerating(false);
    }
  };

  if (!rental) return null;

  const activeCharges = charges.filter((c) => c.status !== 'cancelado');
  const charged = activeCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
  const received = activeCharges.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  const pending = charges
    .filter((c) => c.status === 'pendente' || c.status === 'parcial')
    .reduce((sum, c) => sum + (c.remaining_amount || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-[#6B3FA0]" />
              Locação {rental.rental_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-medium">{rental.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefone:</span>
                  <span className="font-medium">{rental.client_phone || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Aparelho:</span>
                  <span className="font-medium text-right">
                    {rental.product_name}
                    <span className="block text-xs text-slate-500">
                      NS: {rental.serial_number || '—'}
                    </span>
                  </span>
                </div>
              </Card>

              <Card className="p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Prazo:</span>
                  <span className="font-medium">
                    {rental.term_type === 'indeterminado' ? 'Indeterminado' : 'Definido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Início:</span>
                  <span className="font-medium">{formatDate(rental.start_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Término:</span>
                  <span className="font-medium">
                    {rental.term_type === 'indeterminado' && rental.status === 'ativa'
                      ? 'Sem previsão'
                      : formatDate(rental.end_date || rental.termination_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mensalidade:</span>
                  <span className="font-semibold text-[#6B3FA0]">
                    {formatCurrency(rental.monthly_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vencimento:</span>
                  <span className="font-medium">Dia {rental.due_day}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      statusStyles[rental.status] || statusStyles.encerrada
                    }`}
                  >
                    {statusLabels[rental.status] || rental.status}
                  </span>
                </div>
              </Card>
            </div>

            {rental.service_name && (
              <p className="text-xs text-slate-500">
                Serviço vinculado: <span className="font-medium">{rental.service_name}</span>
              </p>
            )}

            {rental.notes && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-xs text-slate-500 mb-1">Observações</p>
                <p className="text-slate-700 whitespace-pre-line">{rental.notes}</p>
              </div>
            )}

            {rental.status !== 'ativa' && rental.termination_date && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm space-y-1">
                <p className="text-xs font-semibold text-amber-700 uppercase">Encerramento</p>
                <p className="text-slate-700">
                  {formatDate(rental.termination_date)}
                  {rental.termination_reason ? ` · ${rental.termination_reason}` : ''}
                </p>
                <p className="text-xs text-slate-600">
                  {rental.device_returned
                    ? 'Aparelho devolvido ao estoque'
                    : 'Aparelho ainda não devolvido ao estoque'}
                  {rental.device_return_condition ? ` · ${rental.device_return_condition}` : ''}
                </p>
              </div>
            )}

            {/* Totais */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <p className="text-xs text-slate-500">Cobrado</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(charged)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500">Recebido</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(received)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500">Em aberto</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(pending)}</p>
              </Card>
            </div>

            {/* Cobranças */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Cobranças mensais</h3>
              {rental.status === 'ativa' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                  Gerar cobranças
                </Button>
              )}
            </div>

            <RentalChargesList
              charges={charges}
              loading={loading}
              onPay={(charge) => {
                setSelectedCharge(charge);
                setPaymentOpen(true);
              }}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {rental.status === 'ativa' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEditRental?.(rental);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    onOpenChange(false);
                    onEndRental?.(rental);
                  }}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Encerrar locação
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RentalChargePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        charge={selectedCharge}
        onPaid={() => {
          loadCharges();
          onChanged?.();
        }}
      />
    </>
  );
}