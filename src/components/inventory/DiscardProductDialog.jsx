import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const reasonLabels = {
  quebra: 'Quebra / Defeito',
  descarte: 'Descarte',
  fim_de_vida: 'Fim de vida útil',
};

export default function DiscardProductDialog({ open, onOpenChange, product, onSuccess }) {
  const [formData, setFormData] = useState({
    discard_reason: 'quebra',
    discard_date: new Date().toISOString().slice(0, 10),
    discard_protocol: '',
    discard_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        discard_reason: 'quebra',
        discard_date: new Date().toISOString().slice(0, 10),
        discard_protocol: '',
        discard_notes: '',
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.discard_reason) {
      toast.error('Informe o motivo da baixa');
      return;
    }
    if (!formData.discard_date) {
      toast.error('Informe a data da baixa');
      return;
    }

    setSubmitting(true);
    try {
      let user;
      try {
        user = await base44.auth.me();
      } catch {
        user = null;
      }

      await base44.entities.Product.update(product.id, {
        status: 'descartado',
        discard_reason: formData.discard_reason,
        discard_date: formData.discard_date,
        discard_protocol: formData.discard_protocol || null,
        discard_notes: formData.discard_notes || null,
        discarded_by_id: user?.id || null,
        discarded_by_name: user?.full_name || null,
      });

      toast.success('Baixa registrada com sucesso');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar baixa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Dar Baixa de Aparelho
          </DialogTitle>
        </DialogHeader>

        {product && (
          <div className="bg-slate-50 p-3 rounded-lg space-y-1">
            <p className="font-semibold text-slate-800">{product.name}</p>
            <p className="text-sm text-slate-600">
              NS: {product.serial_number || '-'}
              {product.brand || product.model
                ? ` • ${product.brand || ''} ${product.model || ''}`.trim()
                : ''}
            </p>
            <p className="text-xs text-amber-600 font-medium">
              ⚠ O aparelho sairá do estoque e da aba Trial, mas o registro será mantido na aba Baixas.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo da baixa *</Label>
            <Select
              value={formData.discard_reason}
              onValueChange={(v) => setFormData({ ...formData, discard_reason: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da baixa *</Label>
            <Input
              type="date"
              value={formData.discard_date}
              onChange={(e) => setFormData({ ...formData, discard_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Nº de NF / Protocolo</Label>
            <Input
              value={formData.discard_protocol}
              onChange={(e) => setFormData({ ...formData, discard_protocol: e.target.value })}
              placeholder="Ex: NF 12345 / Protocolo 2026-001"
            />
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={formData.discard_notes}
              onChange={(e) => setFormData({ ...formData, discard_notes: e.target.value })}
              placeholder="Descreva o problema ou motivo detalhado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {submitting ? 'Registrando...' : 'Confirmar Baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}