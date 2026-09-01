import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categoryLabels = {
  recepcao: 'Recepção',
  comercial: 'Comercial',
  queixa_cliente: 'Queixa do Cliente',
  agendamento: 'Agendamento',
  outros: 'Outros'
};

export default function ObservationForm({ open, onOpenChange, clientId, clientName, observation, onSuccess }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'recepcao',
    author_name: '',
    subject: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (observation) {
      setForm({
        date: observation.date || '',
        category: observation.category || 'recepcao',
        author_name: observation.author_name || '',
        subject: observation.subject || '',
        content: observation.content || ''
      });
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        category: 'recepcao',
        author_name: '',
        subject: '',
        content: ''
      });
    }
  }, [observation, open]);

  const handleSave = async () => {
    if (!form.date || !form.content) {
      toast.error('Preencha a data e o conteúdo da observação');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, client_id: clientId, client_name: clientName };
      if (observation) {
        await base44.entities.ClientObservation.update(observation.id, payload);
        toast.success('Observação atualizada');
      } else {
        await base44.entities.ClientObservation.create(payload);
        toast.success('Observação registrada');
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao salvar observação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{observation ? 'Editar Observação' : 'Nova Observação'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Autor</Label>
            <Input
              placeholder="Nome de quem registrou"
              value={form.author_name}
              onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Assunto</Label>
            <Input
              placeholder="Resumo da observação"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Conteúdo *</Label>
            <Textarea
              rows={5}
              placeholder="Descreva a observação, contexto, informações relevantes..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
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