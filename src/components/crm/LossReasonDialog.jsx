import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const lossReasons = {
  preco: 'Preço alto',
  desistencia: 'Desistência',
  concorrente: 'Comprou no concorrente',
  sem_indicacao_medica: 'Sem indicação médica',
  outro: 'Outro motivo',
};

export default function LossReasonDialog({ open, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({ loss_reason: reason, loss_notes: notes });
    setReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Por que perdemos este cliente?</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(lossReasons).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              className="mt-1"
              placeholder="Detalhes sobre a perda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            disabled={!reason}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}