import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NonSerializedProductForm({ open, onOpenChange, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stock_type: 'nao_serializado',
    name: '',
    category: 'bateria',
    brand: '',
    model: '',
    quantity: 0,
    cost_price: 0,
    sale_price: 0,
    status: 'disponivel',
    min_stock: 10,
    nota_fiscal_entrada: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (product) {
      setFormData({
        stock_type: 'nao_serializado',
        name: product.name || '',
        category: product.category || 'bateria',
        brand: product.brand || '',
        model: product.model || '',
        quantity: product.quantity || 0,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        status: product.status || 'disponivel',
        min_stock: product.min_stock || 10,
        nota_fiscal_entrada: product.nota_fiscal_entrada || '',
        entry_date: product.entry_date || new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData({
        stock_type: 'nao_serializado',
        name: '',
        category: 'bateria',
        brand: '',
        model: '',
        quantity: 0,
        cost_price: 0,
        sale_price: 0,
        status: 'disponivel',
        min_stock: 10,
        nota_fiscal_entrada: '',
        entry_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        quantity: Number(formData.quantity),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        min_stock: Number(formData.min_stock),
        status: Number(formData.quantity) <= Number(formData.min_stock) ? 'baixo_estoque' : 'disponivel'
      };

      if (product) {
        await base44.entities.Product.update(product.id, dataToSave);
        toast.success('Produto atualizado!');
        await onSuccess();
        onOpenChange(false);
        window.location.href = createPageUrl('Inventory');
      } else {
        const newProduct = await base44.entities.Product.create(dataToSave);
        
        // Registrar entrada no estoque
        if (dataToSave.quantity > 0) {
          await base44.entities.StockMovement.create({
            product_id: newProduct.id,
            product_name: formData.name,
            type: 'entrada',
            quantity: dataToSave.quantity,
            reason: `Entrada inicial - NF: ${formData.nota_fiscal_entrada || 'Sem NF'}`
          });
        }

        toast.success('Produto cadastrado!');
        await onSuccess();
        onOpenChange(false);
        window.location.href = createPageUrl('Inventory');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {product ? 'Editar Produto (Quantidade)' : 'Novo Produto (Quantidade)'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bateria">Bateria</SelectItem>
                  <SelectItem value="cerustop">Cerustop</SelectItem>
                  <SelectItem value="gancho">Gancho</SelectItem>
                  <SelectItem value="gaveta">Gaveta</SelectItem>
                  <SelectItem value="molde">Molde</SelectItem>
                  <SelectItem value="oliva">Oliva</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                  <SelectItem value="receptor">Receptor</SelectItem>
                  <SelectItem value="tubo_molde">Tubo de Molde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Marca"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo/Referência</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Modelo ou referência"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade Inicial *</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NF de Entrada</Label>
              <Input
                value={formData.nota_fiscal_entrada}
                onChange={(e) => setFormData({ ...formData, nota_fiscal_entrada: e.target.value })}
                placeholder="Número da NF"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Custo Unit. (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Venda Unit. (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {product ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}