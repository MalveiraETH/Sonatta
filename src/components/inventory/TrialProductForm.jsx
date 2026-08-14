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
import { Loader2, Ear } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = () => ({
  stock_type: 'serializado',
  is_trial: true,
  name: '',
  category: 'aparelho_auditivo',
  brand: '',
  model: '',
  serial_number: '',
  reference: '',
  quantity: 1,
  cost_price: 0,
  sale_price: 0,
  status: 'disponivel',
  nota_fiscal_entrada: '',
  entry_date: new Date().toISOString().split('T')[0],
  warranty_years: 2,
  power_type: 'pilha',
  notes: '',
});

export default function TrialProductForm({ open, onOpenChange, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [serialDuplicate, setSerialDuplicate] = useState(null);

  useEffect(() => {
    if (product) {
      setFormData({
        stock_type: 'serializado',
        is_trial: true,
        name: product.name || '',
        category: product.category || 'aparelho_auditivo',
        brand: product.brand || '',
        model: product.model || '',
        serial_number: product.serial_number || '',
        reference: product.reference || '',
        quantity: 1,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        status: product.status || 'disponivel',
        nota_fiscal_entrada: product.nota_fiscal_entrada || '',
        entry_date: product.entry_date || new Date().toISOString().split('T')[0],
        warranty_years: product.warranty_years || 2,
        power_type: product.power_type || 'pilha',
        notes: product.notes || '',
      });
    } else {
      setFormData(emptyForm());
    }
  }, [product, open]);

  const setField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  // Verificação em tempo real de número de série duplicado
  useEffect(() => {
    if (!formData.serial_number) { setSerialDuplicate(null); return; }
    const timer = setTimeout(async () => {
      const existing = await base44.entities.Product.filter({ serial_number: formData.serial_number, stock_type: 'serializado' });
      const dup = existing.find((p) => !product || p.id !== product.id);
      setSerialDuplicate(dup || null);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.serial_number]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.serial_number) {
      toast.error('Preencha os campos obrigatórios (Nome e Nº de Série)');
      return;
    }
    setLoading(true);
    try {
      // Verificar duplicidade de número de série
      const existing = await base44.entities.Product.filter({ serial_number: formData.serial_number, stock_type: 'serializado' });
      const duplicate = existing.find((p) => !product || p.id !== product.id);
      if (duplicate) {
        toast.error(`Número de série "${formData.serial_number}" já está cadastrado para o produto "${duplicate.name}".`, { duration: 6000 });
        setLoading(false);
        return;
      }
      const dataToSave = {
        ...formData,
        is_trial: true,
        quantity: 1,
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        reference: formData.reference || '',
      };
      if (product) {
        await base44.entities.Product.update(product.id, dataToSave);
        toast.success('Produto de trial atualizado!');
        await onSuccess();
        onOpenChange(false);
      } else {
        const newProduct = await base44.entities.Product.create(dataToSave);
        await base44.entities.StockMovement.create({
          product_id: newProduct.id,
          product_name: formData.name,
          type: 'entrada',
          quantity: 1,
          reason: `Entrada de produto de trial${formData.nota_fiscal_entrada ? ` - NF: ${formData.nota_fiscal_entrada}` : ''}`
        });
        toast.success('Produto de trial cadastrado!');
        await onSuccess();
        onOpenChange(false);
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
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Ear className="h-5 w-5 text-[#6B3FA0]" />
            {product ? 'Editar Produto de Trial' : 'Novo Produto de Trial'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Produtos de trial são destinados apenas para testes em clientes e não serão vendidos.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Nome + Referência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="Nome do produto" />
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={formData.reference} onChange={(e) => setField('reference', e.target.value)} placeholder="Ex: REF-001" />
            </div>
          </div>

          {/* Categoria + Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria do Produto *</Label>
              <Select value={formData.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aparelho_auditivo">Aparelho Auditivo</SelectItem>
                  <SelectItem value="carregador">Carregador</SelectItem>
                  <SelectItem value="desumidificador">Desumidificador</SelectItem>
                  <SelectItem value="microfone">Microfone</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={formData.brand} onValueChange={(v) => setField('brand', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONAK">PHONAK</SelectItem>
                  <SelectItem value="ARGOSY">ARGOSY</SelectItem>
                  <SelectItem value="STARKEY">STARKEY</SelectItem>
                  <SelectItem value="WIDEX">WIDEX</SelectItem>
                  <SelectItem value="RESOUND">RESOUND</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modelo + Série */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={formData.model} onChange={(e) => setField('model', e.target.value)} placeholder="Modelo" />
            </div>
            <div className="space-y-2">
              <Label>Nº de Série *</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => setField('serial_number', e.target.value)}
                placeholder="Número de série único"
                className={serialDuplicate ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {serialDuplicate && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Nº de série já cadastrado em "{serialDuplicate.name}"
                </p>
              )}
            </div>
          </div>

          {/* NF + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NF de Entrada</Label>
              <Input value={formData.nota_fiscal_entrada} onChange={(e) => setField('nota_fiscal_entrada', e.target.value)} placeholder="Número da NF" />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Input type="date" value={formData.entry_date} onChange={(e) => setField('entry_date', e.target.value)} />
            </div>
          </div>

          {/* Custo (apenas referência, sem preço de venda) */}
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-slate-700 mb-3">Custo (Referência)</p>
            <div className="space-y-2">
              <Label>Custo do Produto (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={formData.cost_price}
                onChange={(e) => setField('cost_price', e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-slate-400">Produto de trial não tem preço de venda — apenas custo de referência.</p>
            </div>
          </div>

          {/* Status + Garantia + Funcionamento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="reservado">Em Teste</SelectItem>
                  <SelectItem value="vendido">Baixado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Garantia</Label>
              <Select value={String(formData.warranty_years)} onValueChange={(v) => setField('warranty_years', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 anos</SelectItem>
                  <SelectItem value="3">3 anos</SelectItem>
                  <SelectItem value="4">4 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Funcionamento</Label>
              <Select value={formData.power_type} onValueChange={(v) => setField('power_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilha">Pilha</SelectItem>
                  <SelectItem value="bateria_recarregavel">Bateria Recarregável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {product ? 'Salvar' : 'Cadastrar Trial'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}