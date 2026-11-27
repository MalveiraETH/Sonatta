import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NIVEIS = ['90', '70', '50', '30', '10', '5'];

export default function NewReferenceDialog({ open, onOpenChange, draft, onCreated }) {
  const [form, setForm] = useState(draft || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(draft || {});
  }, [open, draft]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!form.reference?.trim() || !form.name?.trim()) {
      toast.error('Informe a referência e o nome do aparelho');
      return;
    }
    if (!form.category) {
      toast.error('Selecione o nível de tecnologia');
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.ReferenceProduct.create({
        reference: form.reference.trim(),
        name: form.name.trim(),
        brand: form.brand || '',
        category: form.category,
        cost: Number(form.cost) || 0,
        include_fixed_cost: form.include_fixed_cost !== false,
        warranty_years: Number(form.warranty_years ?? 2),
        power_type: form.power_type || 'bateria_recarregavel',
      });
      toast.success('Produto de referência cadastrado');
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao cadastrar referência');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo produto de referência</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Referência *</Label>
              <Input
                value={form.reference || ''}
                onChange={(e) => set({ reference: e.target.value })}
                placeholder="Ex: 012-3456"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nível de tecnologia *</Label>
              <Select value={form.category || ''} onValueChange={(value) => set({ category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((nivel) => (
                    <SelectItem key={nivel} value={nivel}>
                      Nível {nivel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome do aparelho *</Label>
            <Input
              value={form.name || ''}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Nome do aparelho"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Marca</Label>
              <Input value={form.brand || ''} onChange={(e) => set({ brand: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo (R$)</Label>
              <CurrencyInput value={form.cost} onChange={(value) => set({ cost: value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Garantia</Label>
              <Select
                value={String(form.warranty_years ?? 2)}
                onValueChange={(value) => set({ warranty_years: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano === 0 ? 'Sem garantia' : `${ano} ano${ano > 1 ? 's' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Funcionamento</Label>
              <Select
                value={form.power_type || 'bateria_recarregavel'}
                onValueChange={(value) => set({ power_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilha">Pilha</SelectItem>
                  <SelectItem value="bateria_recarregavel">Bateria recarregável</SelectItem>
                  <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#6B3FA0] hover:bg-[#834CB8]"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cadastrar referência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}