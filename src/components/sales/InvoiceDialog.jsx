import React, { useState } from 'react';
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
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function InvoiceDialog({ open, onOpenChange, sale, onSuccess }) {
  const [invoiceNumber, setInvoiceNumber] = useState(sale?.nota_fiscal || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!invoiceNumber.trim()) {
      toast.error('Digite o número da nota fiscal');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Sale.update(sale.id, {
        nota_fiscal: invoiceNumber.trim()
      });
      toast.success('Nota fiscal salva');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar nota fiscal');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Nota Fiscal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Venda</Label>
            <div className="text-sm text-slate-600">
              {sale?.sale_number} - {sale?.client_name}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice">Número da Nota Fiscal</Label>
            <Input
              id="invoice"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Digite o número da NF"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}