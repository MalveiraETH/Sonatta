import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const recordTypeLabels = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  avaliacao: 'Avaliação',
  ajuste: 'Ajuste',
  exame: 'Exame',
  outros: 'Outros'
};

export default function MedicalRecordForm({ open, onOpenChange, clientId, clientName, record, onSuccess }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    record_type: 'consulta',
    professional_name: '',
    chief_complaint: '',
    notes: '',
    audiogram_notes: '',
    next_steps: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        date: record.date || '',
        record_type: record.record_type || 'consulta',
        professional_name: record.professional_name || '',
        chief_complaint: record.chief_complaint || '',
        notes: record.notes || '',
        audiogram_notes: record.audiogram_notes || '',
        next_steps: record.next_steps || ''
      });
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        record_type: 'consulta',
        professional_name: '',
        chief_complaint: '',
        notes: '',
        audiogram_notes: '',
        next_steps: ''
      });
    }
  }, [record, open]);

  const handleSave = async () => {
    if (!form.date || !form.notes) {
      toast.error('Preencha a data e as anotações');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, client_id: clientId, client_name: clientName };
      if (record) {
        await base44.entities.MedicalRecord.update(record.id, payload);
        toast.success('Prontuário atualizado');
      } else {
        await base44.entities.MedicalRecord.create(payload);
        toast.success('Prontuário registrado');
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao salvar prontuário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Prontuário' : 'Novo Prontuário'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data do Atendimento *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.record_type} onValueChange={v => setForm(f => ({ ...f, record_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(recordTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Profissional Responsável</Label>
            <Input
              placeholder="Nome do profissional"
              value={form.professional_name}
              onChange={e => setForm(f => ({ ...f, professional_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Queixa Principal</Label>
            <Input
              placeholder="Motivo da consulta"
              value={form.chief_complaint}
              onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Evolução / Anotações *</Label>
            <Textarea
              rows={4}
              placeholder="Descreva o atendimento, evolução do paciente..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Observações Audiológicas</Label>
            <Textarea
              rows={2}
              placeholder="Resultados de exames, ajuste de aparelho..."
              value={form.audiogram_notes}
              onChange={e => setForm(f => ({ ...f, audiogram_notes: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Próximos Passos / Conduta</Label>
            <Textarea
              rows={2}
              placeholder="Próximo retorno, encaminhamentos..."
              value={form.next_steps}
              onChange={e => setForm(f => ({ ...f, next_steps: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}