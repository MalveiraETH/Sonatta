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
import { Loader2, BookOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTenant } from '@/lib/useTenant';

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
  reference: '',
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
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [billingCfg, setBillingCfg] = useState(null);
  const [includeFixedCost, setIncludeFixedCost] = useState(true);
  const [referenceProducts, setReferenceProducts] = useState([]);
  const [serialDuplicate, setSerialDuplicate] = useState(null);

  useEffect(() => {
    const loadBilling = async () => {
      try {
        const [allSettings, refProds] = await Promise.all([
          base44.entities.AppSettings.list(),
          base44.entities.ReferenceProduct.list()
        ]);
        const rec = allSettings.find((r) => r.setting_key === 'billing_config');
        if (rec?.setting_value) setBillingCfg(rec.setting_value);
        setReferenceProducts(refProds);
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
        reference: product.reference || '',
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

  const finalPrice = Number(formData.sale_price || 0);
  const totalDiscounts = finalPrice * ((Number(cardFee) + Number(taxPercent) + Number(referralPercent)) / 100);
  const netResult = finalPrice - totalDiscounts - totalCost;

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

  // Find reference product by reference code typed in the form
  const matchedRefProduct = formData.reference
    ? referenceProducts.find(
        (rp) => rp.reference.trim().toLowerCase() === formData.reference.trim().toLowerCase()
      )
    : null;

  const calcRefFinalPrice = (rp) => {
    if (!billingCfg || !rp) return null;
    const inclFixed = rp.include_fixed_cost !== false;
    const fcost = inclFixed ? (billingCfg.fixed_cost || 0) : 0;
    const tc = (rp.cost || 0) + fcost;
    const markupPctRef = billingCfg[`markup_category_${rp.category}`] || 0;
    return tc + tc * (markupPctRef / 100);
  };

  const refFinalPrice = calcRefFinalPrice(matchedRefProduct);

  const handleMarkupCategoryChange = (cat) => {
    const pct = getMarkupPct(cat);
    const newMarkupValue = pct !== null ? totalCost * (Number(pct) / 100) : 0;
    setFormData((prev) => ({
      ...prev,
      markup_category: cat,
      cost_price: totalCost,
      sale_price: parseFloat((totalCost + newMarkupValue).toFixed(2)), // reseta ao trocar categoria
    }));
  };

  // Recalculate cost_price when cost inputs change; sale_price (Preço Final) is NOT auto-overridden
  useEffect(() => {
    const eff = includeFixedCost ? fixedCost : 0;
    const tc = Number(formData.product_cost || 0) + Number(formData.icms || 0) + Number(formData.ipi || 0) + eff;
    setFormData((prev) => ({
      ...prev,
      cost_price: parseFloat(tc.toFixed(2)),
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
      // Verificar duplicidade de número de série
      const existing = await base44.entities.Product.filter({ serial_number: formData.serial_number, stock_type: 'serializado' });
      const duplicate = existing.find((p) => !product || p.id !== product.id);
      if (duplicate) {
        toast.error(`Número de série "${formData.serial_number}" já está cadastrado para o produto "${duplicate.name}". Cada aparelho deve ter um número de série único.`, { duration: 6000 });
        setLoading(false);
        return;
      }
      const dataToSave = {
        ...formData,
        include_fixed_cost: includeFixedCost,
        quantity: 1,
        icms: Number(formData.icms),
        ipi: Number(formData.ipi),
        product_cost: Number(formData.product_cost),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        reference: formData.reference || '',
      };
      if (product) {
        await base44.entities.Product.update(product.id, dataToSave);
        toast.success('Produto atualizado!');
        await onSuccess();
        onOpenChange(false);
      } else {
        const newProduct = await base44.entities.Product.create({ ...dataToSave, tenant_id: tenantId });
        await base44.entities.StockMovement.create({
          product_id: newProduct.id,
          product_name: formData.name,
          type: 'entrada',
          quantity: 1,
          reason: `Entrada NF: ${formData.nota_fiscal_entrada || 'Sem NF'}`,
          tenant_id: tenantId
        });
        toast.success('Produto cadastrado!');
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
          <DialogTitle className="text-xl font-bold text-slate-800">
            {product ? 'Editar Produto Serializado' : 'Novo Produto Serializado'}
          </DialogTitle>
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
              <Input
                value={formData.reference}
                onChange={(e) => setField('reference', e.target.value)}
                placeholder="Ex: REF-001"
              />
              {formData.reference && !matchedRefProduct && (
                <p className="text-xs text-amber-600">Referência não encontrada em Produtos de Referência</p>
              )}
              {matchedRefProduct && (
                <p className="text-xs text-green-600 font-medium">✓ {matchedRefProduct.name}</p>
              )}
            </div>
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
                    <Switch checked={includeFixedCost} onCheckedChange={setIncludeFixedCost} className="data-[state=checked]:bg-[#6B3FA0]" />
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
                <Label>Preço Calculado (R$)</Label>
                <Input value={BRL(suggestedSalePrice)} readOnly className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400">Custo Total + Markup (referência)</p>
              </div>
            </div>
          </div>

          {/* ── Produto de Referência (comparação por código) ── */}
          {matchedRefProduct && refFinalPrice !== null && (
            <div className="border-t bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-semibold text-amber-800">Produto de Referência Encontrado</p>
              </div>
              <div className="flex items-center justify-between bg-white border border-amber-200 rounded-md px-3 py-2">
                <div>
                  <span className="text-xs text-slate-500 font-medium">{matchedRefProduct.reference} — </span>
                  <span className="text-sm font-semibold text-slate-800">{matchedRefProduct.name}</span>
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Cat. {matchedRefProduct.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Valor Final (Referência)</p>
                    <p className="text-base font-bold text-amber-700">{BRL(refFinalPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Preço Calculado (Form)</p>
                    <p className="text-base font-bold text-purple-700">{BRL(suggestedSalePrice)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField('sale_price', parseFloat(refFinalPrice.toFixed(2)))}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1.5 rounded whitespace-nowrap"
                  >
                    Usar Ref.
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Clique em "Usar Ref." para aplicar o valor da tabela de referência como Preço Final.</p>
            </div>
          )}

          {/* ── Preço Final ── */}
          <div className="pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-blue-800 font-semibold text-sm">Preço Final de Venda (R$) *</Label>
                <button
                  type="button"
                  onClick={() => setField('sale_price', parseFloat(suggestedSalePrice.toFixed(2)))}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  Usar preço calculado
                </button>
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setField('sale_price', e.target.value)}
                className="bg-white border-blue-300 text-blue-900 font-bold text-base focus:ring-blue-400"
              />
              <p className="text-xs text-slate-500">Este é o valor salvo no produto. Edite livremente para capturar margem extra ou aplicar desconto.</p>
            </div>
          </div>

          {/* ── Taxas (referência) ── */}
          <div className="pt-2 border-t bg-green-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-green-800 mb-3">Resultado (baseado no Preço Final)</p>
            <div className="space-y-2">
              <Label>Valor Líquido (R$)</Label>
              <Input value={BRL(netResult)} readOnly className="bg-white text-green-700 font-bold text-lg cursor-not-allowed border-green-300" />
              <p className="text-xs text-slate-400">Preço Final − Total de Descontos − Custo Total</p>
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