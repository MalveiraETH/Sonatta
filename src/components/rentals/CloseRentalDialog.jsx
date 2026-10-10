import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

/**
 * Encerramento da locação: devolve o aparelho ao estoque e interrompe as cobranças futuras.
 */
export default function CloseRentalDialog({ open, onOpenChange, rental, onClosed }) {
  const [terminationDate, setTerminationDate] = useState('');
  const [reason, setReason] = useState('');
  const [deviceReturned, setDeviceReturned] = useState(true);
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTerminationDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setDeviceReturned(true);
      setCondition('');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!terminationDate) {
      toast.error('Informe a data de encerramento');
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke('encerrarLocacao', {
        rental_id: rental.id,
        termination_date: terminationDate,
        termination_reason: reason,
        device_returned: deviceReturned,
        device_return_condition: condition,
        notes
      });
      const cancelled = res?.data?.charges_cancelled ?? 0;
      toast.success(
        cancelled > 0
          ? `Locação encerrada e ${cancelled} cobrança(s) cancelada(s)`
          : 'Locação encerrada!'
      );
      onOpenChange(false);
      onClosed?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Erro ao encerrar locação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar Locação</DialogTitle>
          <DialogDescription>
            As cobranças ainda pendentes com vencimento após o encerramento serão canceladas. As
            cobranças já recebidas permanecem no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Locação:</span>
              <span className="font-medium">{rental?.rental_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-medium">{rental?.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aparelho:</span>
              <span className="font-medium">
                {rental?.product_name} · NS {rental?.serial_number || '—'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de encerramento *</Label>
            <Input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo do encerramento</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: cliente adquiriu o aparelho, devolução, troca..."
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="device_returned"
              checked={deviceReturned}
              onChange={(e) => setDeviceReturned(e.target.checked)}
              className="rounded mt-1"
            />
            <Label htmlFor="device_returned" className="cursor-pointer">
              Aparelho devolvido ao estoque (volta a ficar disponível)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Estado do aparelho na devolução</Label>
            <Input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="Ex: bom estado, com estojo e carregador"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações do encerramento</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? 'Encerrando...' : 'Confirmar Encerramento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}