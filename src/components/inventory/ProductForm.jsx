import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

export default function ProductForm({ open, onOpenChange, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'aparelho_auditivo',
    brand: '',
    model: '',
    serial_number: '',
    quantity: 1,
    cost_price: 0,
    sale_price: 0,
    status: 'disponivel',
    min_stock: 1,
    nota_fiscal_entrada: '',
    entry_date: new Date().toISOString().split('T')[0],
    warranty_years: 2,
    power_type: 'pilha'
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || 'aparelho_auditivo',
        brand: product.brand || '',
        model: product.model || '',
        serial_number: product.serial_number || '',
        quantity: product.quantity || 1,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        status: product.status || 'disponivel',
        min_stock: product.min_stock || 1,
        nota_fiscal_entrada: product.nota_fiscal_entrada || '',
        entry_date: product.entry_date || new Date().toISOString().split('T')[0],
        warranty_years: product.warranty_years || 2,
        power_type: product.power_type || 'pilha'
      });
    } else {
      setFormData({
        name: '',
        category: 'aparelho_auditivo',
        brand: '',
        model: '',
        serial_number: '',
        quantity: 1,
        cost_price: 0,
        sale_price: 0,
        status: 'disponivel',
        min_stock: 1,
        nota_fiscal_entrada: '',
        entry_date: new Date().toISOString().split('T')[0],
        warranty_years: 2,
        power_type: 'pilha'
      });
    }
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sale_price || !formData.serial_number) {
      toast.error('Preencha os campos obrigatórios (Nome, Série, Valor de Venda)');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        quantity: 1,
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        min_stock: 1
      };

      if (product) {
        await base44.entities.Product.update(product.id, dataToSave);
        toast.success('Produto atualizado!');
      } else {
        await base44.entities.Product.create(dataToSave);
        toast.success('Produto cadastrado!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = {
    aparelho_auditivo: 'Aparelho Auditivo',
    acessorio: 'Acessório',
    molde: 'Molde',
    bateria: 'Bateria'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="Nome do produto"
              className="uppercase"
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
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONAK">PHONAK</SelectItem>
                  <SelectItem value="ARGOSY">ARGOSY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                placeholder="Modelo"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Nº de Série *</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value.toUpperCase() })}
                placeholder="Número de série único"
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NF de Entrada</Label>
              <Input
                value={formData.nota_fiscal_entrada}
                onChange={(e) => setFormData({ ...formData, nota_fiscal_entrada: e.target.value.toUpperCase() })}
                placeholder="Número da NF"
                className="uppercase"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Venda (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Garantia</Label>
              <Select
                value={String(formData.warranty_years)}
                onValueChange={(value) => setFormData({ ...formData, warranty_years: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 anos</SelectItem>
                  <SelectItem value="3">3 anos</SelectItem>
                  <SelectItem value="4">4 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Funcionamento</Label>
              <Select
                value={formData.power_type}
                onValueChange={(value) => setFormData({ ...formData, power_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilha">Pilha</SelectItem>
                  <SelectItem value="bateria_recarregavel">Bateria Recarregável</SelectItem>
                </SelectContent>
              </Select>
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