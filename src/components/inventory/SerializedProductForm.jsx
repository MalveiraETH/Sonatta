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

const MARKUP_CATEGORIES = [
  { value: '90', label: 'Categoria 90' },
  { value: '70', label: 'Categoria 70' },
  { value: '50', label: 'Categoria 50' },
  { value: '30', label: 'Categoria 30' },
  { value: '10', label: 'Categoria 10' },
];

const emptyForm = () => ({
  stock_type: 'serializado',
  name: '',
  category: 'aparelho_auditivo',
  brand: '',
  model: '',
  serial_number: '',
  quantity: 1,
  icms: 0,
  ipi: 0,
  product_cost: 0,
  cost_price: 0,
  sale_price: 0,
  status: 'disponivel',
  nota_fiscal_entrada: '',
  entry_date: new Date().toISOString().split('T')[0],
  warranty_years: 2,
  power_type: 'pilha',
  markup_category: '',
});

export default function SerializedProductForm({ open, onOpenChange, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [billingCfg, setBillingCfg] = useState(null);

  // Load billing config
  useEffect(() => {
    const loadBilling = async () => {
      try {
        const all = await base44.entities.AppSettings.list();
        const rec = all.find((r) => r.setting_key === 'billing_config');
        if (rec?.setting_value) setBillingCfg(rec.setting_value);
      } catch (e) {
        console.warn('Billing config not loaded', e.message);
      }
    };
    loadBilling();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        stock_type: 'serializado',
        name: product.name || '',
        category: product.category || 'aparelho_auditivo',
        brand: product.brand || '',
        model: product.model || '',
        serial_number: product.serial_number || '',
        quantity: 1,
        icms: product.icms || 0,
        ipi: product.ipi || 0,
        product_cost: product.product_cost || 0,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        status: product.status || 'disponivel',
        nota_fiscal_entrada: product.nota_fiscal_entrada || '',
        entry_date: product.entry_date || new Date().toISOString().split('T')[0],
        warranty_years: product.warranty_years || 2,
        power_type: product.power_type || 'pilha',
        markup_category: product.markup_category || '',
      });
    } else {
      setFormData(emptyForm());
    }
  }, [product, open]);

  const fixedCost = billingCfg?.fixed_monthly_cost ?? billingCfg?.fixedMonthlyCost ?? 0;
  const cardFee = billingCfg?.card_fee ?? billingCfg?.cardFee ?? 0;
  const taxPercent = billingCfg?.tax_percent ?? billingCfg?.taxPercent ?? 0;
  const referralPercent = billingCfg?.referral_percent ?? billingCfg?.referralPercent ?? 0;

  const getMarkupValue = (cat) => {
    if (!billingCfg || !cat) return null;
    const key = `markup_${cat}`;
    const altKey = `markup${cat}`;
    return billingCfg[key] ?? billingCfg[altKey] ?? null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.serial_number) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        quantity: 1,
        icms: Number(formData.icms),
        ipi: Number(formData.ipi),
        product_cost: Number(formData.product_cost),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
      };

      if (product) {
        await base44.entities.Product.update(product.id, dataToSave);
        toast.success('Produto atualizado!');
        await onSuccess();
        onOpenChange(false);
        window.location.href = createPageUrl('Inventory') + '?tab=serialized';
      } else {
        const newProduct = await base44.entities.Product.create(dataToSave);
        await base44.entities.StockMovement.create({
          product_id: newProduct.id,
          product_name: formData.name,
          type: 'entrada',
          quantity: 1,
          reason: `Entrada NF: ${formData.nota_fiscal_entrada || 'Sem NF'}`
        });
        toast.success('Produto cadastrado!');
        await onSuccess();
        onOpenChange(false);
        window.location.href = createPageUrl('Inventory') + '?tab=serialized';
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const f = (val) => Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {product ? 'Editar Produto Serializado' : 'Novo Produto Serializado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          {/* Categoria produto + Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria do Produto *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
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
              <Select value={formData.brand} onValueChange={(v) => setFormData({ ...formData, brand: v })}>
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
              <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Modelo" />
            </div>
            <div className="space-y-2">
              <Label>Nº de Série *</Label>
              <Input value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} placeholder="Número de série único" />
            </div>
          </div>

          {/* NF + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NF de Entrada</Label>
              <Input value={formData.nota_fiscal_entrada} onChange={(e) => setFormData({ ...formData, nota_fiscal_entrada: e.target.value })} placeholder="Número da NF" />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Input type="date" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} />
            </div>
          </div>

          {/* Separador Custos */}
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-slate-600 mb-3">Composição de Custo</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Custo do Produto (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.product_cost} onChange={(e) => setFormData({ ...formData, product_cost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ICMS (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.icms} onChange={(e) => setFormData({ ...formData, icms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IPI (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.ipi} onChange={(e) => setFormData({ ...formData, ipi: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Custo Total (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Custo Operacional (R$)</Label>
                <Input
                  value={billingCfg ? `R$ ${f(fixedCost)}` : 'Carregando...'}
                  readOnly
                  className="bg-slate-100 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400">Custo Fixo Mensal — configurado em Configurações</p>
              </div>
            </div>
          </div>

          {/* Taxas e Categoria de Markup */}
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-slate-600 mb-3">Taxas e Categoria de Markup</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria de Markup</Label>
                <Select value={formData.markup_category} onValueChange={(v) => setFormData({ ...formData, markup_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MARKUP_CATEGORIES.map((mc) => (
                      <SelectItem key={mc.value} value={mc.value}>
                        {mc.label}{getMarkupValue(mc.value) !== null ? ` — ${getMarkupValue(mc.value)}%` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taxa de Cartão de Crédito</Label>
                <Input value={billingCfg ? `${cardFee}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Percentual de Imposto</Label>
                <Input value={billingCfg ? `${taxPercent}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Percentual de Indicação</Label>
                <Input value={billingCfg ? `${referralPercent}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Preço de Venda */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Preço de Venda (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Status + Garantia + Funcionamento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Garantia</Label>
              <Select value={String(formData.warranty_years)} onValueChange={(v) => setFormData({ ...formData, warranty_years: Number(v) })}>
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
              <Select value={formData.power_type} onValueChange={(v) => setFormData({ ...formData, power_type: v })}>
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
            <Button type="submit" disabled={loading} className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {product ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}