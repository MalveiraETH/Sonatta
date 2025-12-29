import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StockMovementDialog({ open, onOpenChange, product, type, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!quantity || quantity <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    if (type === 'saida' && quantity > product.quantity) {
      toast.error('Quantidade insuficiente em estoque');
      return;
    }

    setLoading(true);
    try {
      let newQuantity = product.quantity;
      if (type === 'entrada') {
        newQuantity += quantity;
      } else {
        newQuantity -= quantity;
      }

      // Atualizar estoque
      await base44.entities.Product.update(product.id, {
        quantity: newQuantity,
        status: newQuantity <= product.min_stock ? 'baixo_estoque' : 'disponivel'
      });

      // Registrar movimentação
      await base44.entities.StockMovement.create({
        product_id: product.id,
        product_name: product.name,
        type,
        quantity,
        reason: reason || (type === 'entrada' ? 'Entrada manual' : 'Saída manual')
      });

      toast.success('Movimentação registrada com sucesso!');
      await onSuccess();
      onOpenChange(false);
      setQuantity(1);
      setReason('');
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao registrar: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="font-semibold text-slate-800">{product?.name}</p>
            <p className="text-sm text-slate-500">Estoque atual: {product?.quantity} unidades</p>
          </div>
          
          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da movimentação"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={type === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar {type === 'entrada' ? 'Entrada' : 'Saída'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}