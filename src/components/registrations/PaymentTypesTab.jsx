import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  pix_parcelado: 'PIX Parcelado',
  cartao_debito: 'Cartão de Débito',
  cartao_credito: 'Cartão de Crédito',
};

const BRAND_OPTIONS = ['Visa', 'Master', 'Elo', 'Amex', 'Hipercard'];

const emptyForm = () => ({
  type: '',
  status: 'ativo',
  notes: '',
  pix_parcelado_rate: '',
  pix_parcelado_max_installments: '',
  card_brands: [],
});

export default function PaymentTypesTab() {
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [expandedBrands, setExpandedBrands] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.PaymentType.list();
      setPaymentTypes(data);
    } catch { toast.error('Erro ao carregar tipos de pagamento'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setExpandedBrands({});
    setDialogOpen(true);
  };

  const openEdit = (pt) => {
    setEditing(pt);
    setForm({
      type: pt.type,
      status: pt.status || 'ativo',
      notes: pt.notes || '',
      pix_parcelado_rate: pt.pix_parcelado_rate ?? '',
      pix_parcelado_max_installments: pt.pix_parcelado_max_installments ?? '',
      card_brands: pt.card_brands ? JSON.parse(JSON.stringify(pt.card_brands)) : [],
    });
    setExpandedBrands({});
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.type) { toast.error('Selecione o tipo de pagamento'); return false; }
    if (['cartao_debito', 'cartao_credito'].includes(form.type)) {
      for (const brand of form.card_brands) {
        if (!brand.brand) { toast.error('Bandeira é obrigatória'); return false; }
        if (form.type === 'cartao_debito') {
          if (brand.rate === '' || brand.rate < 0) { toast.error('Taxa obrigatória para ' + brand.brand); return false; }
        }
        if (form.type === 'cartao_credito') {
          for (const ir of (brand.installment_rates || [])) {
            if (ir.installments === '' || ir.installments === null || ir.installments === undefined || ir.rate === '' || ir.rate === null) { toast.error('Parcela e taxa obrigatórias'); return false; }
            if (ir.rate < 0 || ir.rate > 100) { toast.error('Taxa deve ser entre 0 e 100'); return false; }
          }
          // check duplicate installments
          const nums = (brand.installment_rates || []).map(r => r.installments);
          if (new Set(nums).size !== nums.length) { toast.error('Parcelas duplicadas na bandeira ' + brand.brand); return false; }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload = {
      type: form.type,
      status: form.status,
      notes: form.notes,
      card_brands: ['cartao_debito', 'cartao_credito'].includes(form.type) ? form.card_brands.map(b => ({
        ...b,
        rate: b.rate !== '' && b.rate !== undefined ? Number(b.rate) : null,
        installment_rates: (b.installment_rates || []).map(ir => ({
          installments: ir.installments !== '' ? Number(ir.installments) : null,
          rate: ir.rate !== '' && ir.rate !== undefined ? Number(ir.rate) : null,
        })),
      })) : [],
      pix_parcelado_rate: form.type === 'pix_parcelado' ? (Number(form.pix_parcelado_rate) || null) : null,
      pix_parcelado_max_installments: form.type === 'pix_parcelado' ? (Number(form.pix_parcelado_max_installments) || null) : null,
    };
    try {
      if (editing) {
        await base44.entities.PaymentType.update(editing.id, payload);
        toast.success('Atualizado!');
      } else {
        await base44.entities.PaymentType.create(payload);
        toast.success('Criado!');
      }
      setDialogOpen(false);
      loadData();
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleToggleStatus = async (pt) => {
    const newStatus = pt.status === 'ativo' ? 'inativo' : 'ativo';
    await base44.entities.PaymentType.update(pt.id, { status: newStatus });
    loadData();
  };

  const handleDelete = async (pt) => {
    try {
      await base44.entities.PaymentType.delete(pt.id);
      toast.success('Excluído!');
      setDeleteConfirm(null);
      loadData();
    } catch {
      toast.error('Não foi possível excluir. Inative este tipo de pagamento.');
      setDeleteConfirm(null);
    }
  };

  // Brand helpers
  const addBrand = () => {
    const brands = [...form.card_brands, { brand: '', rate: '', installment_rates: [] }];
    setForm(f => ({ ...f, card_brands: brands }));
    setExpandedBrands(e => ({ ...e, [brands.length - 1]: true }));
  };

  const removeBrand = (i) => {
    setForm(f => ({ ...f, card_brands: f.card_brands.filter((_, idx) => idx !== i) }));
  };

  const updateBrand = (i, key, val) => {
    setForm(f => {
      const brands = [...f.card_brands];
      brands[i] = { ...brands[i], [key]: val };
      return { ...f, card_brands: brands };
    });
  };

  const addInstallmentRate = (brandIdx) => {
    setForm(f => {
      const brands = [...f.card_brands];
      brands[brandIdx] = { ...brands[brandIdx], installment_rates: [...(brands[brandIdx].installment_rates || []), { installments: '', rate: '' }] };
      return { ...f, card_brands: brands };
    });
  };

  const removeInstallmentRate = (brandIdx, rateIdx) => {
    setForm(f => {
      const brands = [...f.card_brands];
      brands[brandIdx] = { ...brands[brandIdx], installment_rates: brands[brandIdx].installment_rates.filter((_, i) => i !== rateIdx) };
      return { ...f, card_brands: brands };
    });
  };

  const updateInstallmentRate = (brandIdx, rateIdx, key, val) => {
    setForm(f => {
      const brands = [...f.card_brands];
      const rates = [...brands[brandIdx].installment_rates];
      rates[rateIdx] = { ...rates[rateIdx], [key]: val };
      brands[brandIdx] = { ...brands[brandIdx], installment_rates: rates };
      return { ...f, card_brands: brands };
    });
  };

  const getSummary = (pt) => {
    if (pt.type === 'pix_parcelado') {
      const parts = [];
      if (pt.pix_parcelado_rate) parts.push(`Taxa: ${pt.pix_parcelado_rate}%`);
      if (pt.pix_parcelado_max_installments) parts.push(`Máx. ${pt.pix_parcelado_max_installments}x`);
      return parts.join(' · ') || 'Sem taxa configurada';
    }
    if (['cartao_debito', 'cartao_credito'].includes(pt.type)) {
      const brands = pt.card_brands || [];
      if (brands.length === 0) return 'Nenhuma bandeira cadastrada';
      return brands.map(b => {
        const name = b.brand || '?';
        if (pt.type === 'cartao_credito') {
          const nParcelas = (b.installment_rates || []).length;
          return `${name} (${nParcelas}x)`;
        }
        return name;
      }).join(', ');
    }
    return '—';
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tipos de Pagamento</h2>
          <p className="text-sm text-slate-500">Gerencie formas de recebimento e taxas</p>
        </div>
        <Button onClick={openCreate} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
          <Plus className="h-4 w-4 mr-2" /> Novo Tipo
        </Button>
      </div>

      {paymentTypes.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">Nenhum tipo de pagamento cadastrado</Card>
      ) : (
        <div className="space-y-3">
          {paymentTypes.map(pt => (
            <Card key={pt.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{TYPE_LABELS[pt.type] || pt.type}</span>
                    <Badge className={pt.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                      {pt.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{getSummary(pt)}</p>
                  {pt.notes && <p className="text-xs text-slate-400 mt-1">{pt.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={pt.status === 'ativo'} onCheckedChange={() => handleToggleStatus(pt)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(pt)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(pt)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Tipo de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, card_brands: [] }))} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'pix_parcelado' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Taxa (%)</Label>
                  <Input type="number" step="0.01" min="0" max="100" value={form.pix_parcelado_rate} onChange={e => setForm(f => ({ ...f, pix_parcelado_rate: e.target.value }))} placeholder="Ex: 3.5" />
                </div>
                <div>
                  <Label>Máx. Parcelas</Label>
                  <Input type="number" min="1" value={form.pix_parcelado_max_installments} onChange={e => setForm(f => ({ ...f, pix_parcelado_max_installments: e.target.value }))} placeholder="Ex: 12" />
                </div>
              </div>
            )}

            {form.type === 'cartao_debito' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Bandeiras</Label>
                  <Button variant="outline" size="sm" onClick={addBrand}><Plus className="h-3 w-3 mr-1" /> Bandeira</Button>
                </div>
                {form.card_brands.map((brand, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-[1fr,120px,36px] gap-2 items-end">
                      <div>
                        <Label className="text-xs">Bandeira *</Label>
                        <Input list="brand-options-debit" value={brand.brand} onChange={e => updateBrand(i, 'brand', e.target.value)} placeholder="Ex: Visa, Master..." />
                        <datalist id="brand-options-debit">{BRAND_OPTIONS.map(b => <option key={b} value={b} />)}</datalist>
                      </div>
                      <div>
                        <Label className="text-xs">Taxa (%) *</Label>
                        <Input type="number" step="0.01" min="0" max="100" value={brand.rate} onChange={e => updateBrand(i, 'rate', e.target.value)} placeholder="Ex: 2.39" />
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeBrand(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.type === 'cartao_credito' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Bandeiras</Label>
                  <Button variant="outline" size="sm" onClick={addBrand}><Plus className="h-3 w-3 mr-1" /> Bandeira</Button>
                </div>
                {form.card_brands.map((brand, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="p-3 bg-slate-50 flex items-center gap-2">
                      <div className="flex-1">
                        <Input list="brand-options-credit" value={brand.brand} onChange={e => updateBrand(i, 'brand', e.target.value)} placeholder="Ex: Visa, Master..." />
                        <datalist id="brand-options-credit">{BRAND_OPTIONS.map(b => <option key={b} value={b} />)}</datalist>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setExpandedBrands(e => ({ ...e, [i]: !e[i] }))}>
                        {expandedBrands[i] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeBrand(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {expandedBrands[i] && (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">Parcelas x Taxa</span>
                          <Button variant="outline" size="sm" onClick={() => addInstallmentRate(i)}><Plus className="h-3 w-3 mr-1" /> Parcela</Button>
                        </div>
                        {(brand.installment_rates || []).map((ir, ri) => (
                          <div key={ri} className="grid grid-cols-[1fr,1fr,36px] gap-2 items-end">
                            <div>
                              <Label className="text-xs">Parcelas *</Label>
                              <Input type="number" min="1" value={ir.installments} onChange={e => updateInstallmentRate(i, ri, 'installments', Number(e.target.value))} placeholder="Ex: 1" />
                            </div>
                            <div>
                              <Label className="text-xs">Taxa (%) *</Label>
                              <Input type="number" step="0.01" min="0" max="100" value={ir.rate} onChange={e => updateInstallmentRate(i, ri, 'rate', Number(e.target.value))} placeholder="Ex: 4.99" />
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeInstallmentRate(i, ri)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        {(brand.installment_rates || []).length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-2">Nenhuma parcela cadastrada</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#6B3FA0] hover:bg-[#834CB8]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Deseja excluir <strong>{TYPE_LABELS[deleteConfirm?.type]}</strong>? Se houver vínculos financeiros, prefira inativar.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}