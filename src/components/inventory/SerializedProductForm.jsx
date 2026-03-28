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
import { Switch } from '@/components/ui/switch';
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

const BRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SerializedProductForm({ open, onOpenChange, product, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [billingCfg, setBillingCfg] = useState(null);
  const [includeFixedCost, setIncludeFixedCost] = useState(true);

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
      setIncludeFixedCost(product.include_fixed_cost !== false);
    } else {
      setFormData(emptyForm());
      setIncludeFixedCost(true);
    }
  }, [product, open]);

  const fixedCost = Number(billingCfg?.fixed_cost ?? 0);
  const cardFee = billingCfg?.credit_card_fee ?? 0;
  const taxPercent = billingCfg?.tax_percentage ?? 0;
  const referralPercent = billingCfg?.referral_percentage ?? 0;

  const getMarkupPct = (cat) => {
    if (!billingCfg || !cat) return null;
    return billingCfg[`markup_category_${cat}`] ?? null;
  };

  // Derived calculations
  const productCost = Number(formData.product_cost || 0);
  const icms = Number(formData.icms || 0);
  const ipi = Number(formData.ipi || 0);
  const effectiveFixedCost = includeFixedCost ? fixedCost : 0;
  const totalCost = productCost + icms + ipi + effectiveFixedCost;

  const markupPct = getMarkupPct(formData.markup_category);
  const markupValue = markupPct !== null ? totalCost * (Number(markupPct) / 100) : 0;
  const suggestedSalePrice = totalCost + markupValue;

  const totalDiscounts = suggestedSalePrice * ((Number(cardFee) + Number(taxPercent) + Number(referralPercent)) / 100);
  const netResult = suggestedSalePrice - totalDiscounts - totalCost;

  const setField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleMarkupCategoryChange = (cat) => {
    const pct = getMarkupPct(cat);
    const newMarkupValue = pct !== null ? totalCost * (Number(pct) / 100) : 0;
    setFormData((prev) => ({
      ...prev,
      markup_category: cat,
      cost_price: totalCost,
      sale_price: parseFloat((totalCost + newMarkupValue).toFixed(2)),
    }));
  };

  // Recalculate cost_price and sale_price whenever cost inputs change
  useEffect(() => {
    const eff = includeFixedCost ? fixedCost : 0;
    const tc = Number(formData.product_cost || 0) + Number(formData.icms || 0) + Number(formData.ipi || 0) + eff;
    const pct = getMarkupPct(formData.markup_category);
    const mv = pct !== null ? tc * (Number(pct) / 100) : 0;
    setFormData((prev) => ({
      ...prev,
      cost_price: parseFloat(tc.toFixed(2)),
      sale_price: parseFloat((tc + mv).toFixed(2)),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.product_cost, formData.icms, formData.ipi, billingCfg, includeFixedCost]);

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
        include_fixed_cost: includeFixedCost,
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
            <Input value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="Nome do produto" />
          </div>

          {/* Categoria produto + Marca */}
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
              <Input value={formData.serial_number} onChange={(e) => setField('serial_number', e.target.value)} placeholder="Número de série único" />
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

          {/* ── Composição de Custo ── */}
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-slate-700 mb-3">Composição de Custo</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Custo do Produto (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.product_cost} onChange={(e) => setField('product_cost', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ICMS (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.icms} onChange={(e) => setField('icms', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>IPI (R$)</Label>
                <Input type="number" min="0" step="0.01" value={formData.ipi} onChange={(e) => setField('ipi', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Custo Operacional (R$)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{includeFixedCost ? 'Incluído' : 'Excluído'}</span>
                    <Switch checked={includeFixedCost} onCheckedChange={setIncludeFixedCost} />
                  </div>
                </div>
                <Input value={billingCfg ? BRL(fixedCost) : 'Carregando...'} readOnly className={includeFixedCost ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'} />
                <p className="text-xs text-slate-400">Custo Fixo Mensal — configurado em Configurações</p>
              </div>
              <div className="space-y-2">
                <Label>Custo Total (R$)</Label>
                <Input value={BRL(totalCost)} readOnly className="bg-slate-100 font-semibold text-slate-700 cursor-not-allowed" />
                <p className="text-xs text-slate-400">Custo do Produto + ICMS + IPI{includeFixedCost ? ' + Custo Operacional' : ''}</p>
              </div>
            </div>
          </div>

          {/* ── Markup ── */}
          <div className="pt-2 border-t bg-purple-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-purple-800 mb-3">Markup e Precificação</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria de Markup</Label>
                <Select value={formData.markup_category} onValueChange={handleMarkupCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MARKUP_CATEGORIES.map((mc) => (
                      <SelectItem key={mc.value} value={mc.value}>
                        {mc.label}{getMarkupPct(mc.value) !== null ? ` — ${getMarkupPct(mc.value)}%` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taxa da Categoria (%)</Label>
                <Input
                  value={markupPct !== null ? `${markupPct}%` : '—'}
                  readOnly
                  className="bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label>Valor do Markup (R$)</Label>
                <Input value={BRL(markupValue)} readOnly className="bg-slate-100 text-purple-700 font-semibold cursor-not-allowed" />
                <p className="text-xs text-slate-400">Custo Total × {markupPct ?? 0}%</p>
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda (R$) *</Label>
                <Input value={BRL(suggestedSalePrice)} readOnly className="bg-green-50 text-green-700 font-bold cursor-not-allowed" />
                <p className="text-xs text-slate-400">Custo Total + Markup</p>
              </div>
            </div>
          </div>

          {/* ── Taxas (referência) ── */}
          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-slate-700 mb-3">Taxas (referência)</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Cartão de Crédito</Label>
                <Input value={billingCfg ? `${cardFee}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Percentual de Imposto</Label>
                <Input value={billingCfg ? `${taxPercent}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Percentual de Indicação</Label>
                <Input value={billingCfg ? `${referralPercent}%` : 'Carregando...'} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
            </div>
            <div className="mt-3">
              <div className="space-y-2">
                <Label>Total de descontos (R$)</Label>
                <Input value={BRL(totalDiscounts)} readOnly className="bg-red-50 text-red-700 font-semibold cursor-not-allowed" />
                <p className="text-xs text-slate-400">Preço de Venda × ({cardFee}% + {taxPercent}% + {referralPercent}%)</p>
              </div>
            </div>
          </div>

          {/* ── Resultado ── */}
          <div className="pt-2 border-t bg-green-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-green-800 mb-3">Resultado</p>
            <div className="space-y-2">
              <Label>Valor Líquido (R$)</Label>
              <Input value={BRL(netResult)} readOnly className="bg-white text-green-700 font-bold text-lg cursor-not-allowed border-green-300" />
              <p className="text-xs text-slate-400">Preço de Venda − Total de Descontos − Custo Total</p>
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
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
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