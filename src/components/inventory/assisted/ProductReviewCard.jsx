import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import {
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  BookPlus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { markupPctFor, priceOptions } from '@/lib/assistedPricing';

const NIVEIS = ['90', '70', '50', '30', '10', '5'];
const BRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Chip = ({ children, tone }) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', tones[tone])}>
      {children}
    </span>
  );
};

export default function ProductReviewCard({
  item,
  index,
  billingCfg,
  xmlItems,
  duplicateSerial,
  onChange,
  onRequestReference,
}) {
  const options = priceOptions(item, item.matched_reference, billingCfg);
  const pct = markupPctFor(billingCfg, item.markup_category);
  const set = (patch) => onChange(item.id, patch);
  const xmlItem =
    item.xml_index !== null && item.xml_index !== undefined ? xmlItems[item.xml_index] : null;

  return (
    <Card className={cn('overflow-hidden transition-opacity', !item.selected && 'opacity-60')}>
      <div className="p-3 sm:p-4 flex items-start gap-3">
        <button
          type="button"
          onClick={() => set({ selected: !item.selected })}
          className={cn(
            'mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
            item.selected
              ? 'bg-[#6B3FA0] border-[#6B3FA0] text-white'
              : 'border-slate-300 bg-white text-transparent'
          )}
        >
          <Check className="h-3 w-3" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
            <span className="font-semibold text-slate-900 text-sm truncate">
              {item.product_name || 'Produto sem nome'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            NS {item.serial_number || '—'} • Ref. {item.reference || '—'}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.matched_reference ? (
              <Chip tone="green">Referência carregada</Chip>
            ) : (
              <Chip tone="amber">Sem referência</Chip>
            )}
            {duplicateSerial && <Chip tone="red">NS já cadastrado</Chip>}
            {!item.serial_number && <Chip tone="red">Sem nº de série</Chip>}
            {xmlItem && <Chip tone="blue">Item da NF</Chip>}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-slate-400">Venda</p>
          <p className="text-sm font-bold text-emerald-700">
            {BRL(Number(item.sale_price) > 0 ? item.sale_price : options.best || 0)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => set({ expanded: !item.expanded })}
        >
          {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {item.expanded && (
        <div className="border-t border-slate-100 p-3 sm:p-4 space-y-3 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do produto</Label>
              <Input
                value={item.product_name}
                onChange={(e) => set({ product_name: e.target.value })}
                placeholder="Nome do aparelho"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nº de série</Label>
              <Input
                value={item.serial_number}
                onChange={(e) => set({ serial_number: e.target.value })}
                placeholder="Série única"
                className={duplicateSerial ? 'border-red-400' : ''}
              />
              {duplicateSerial && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Já cadastrado em "{duplicateSerial.name}"
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Referência</Label>
            <Input
              value={item.reference}
              onChange={(e) => set({ reference: e.target.value })}
              placeholder="Código do produto na nota"
            />
            {item.matched_reference ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <BookOpen className="h-3 w-3" />
                <span className="truncate">
                  {item.matched_reference.reference} — {item.matched_reference.name} • Nível{' '}
                  {item.matched_reference.category} • Custo {BRL(item.matched_reference.cost)}
                </span>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onRequestReference(item)}
              >
                <BookPlus className="h-3.5 w-3.5 mr-1.5" />
                Cadastrar produto de referência
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Marca</Label>
              <Input value={item.brand} onChange={(e) => set({ brand: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo</Label>
              <Input value={item.model} onChange={(e) => set({ model: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Custo</Label>
              <CurrencyInput
                value={item.product_cost}
                onChange={(value) => set({ product_cost: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ICMS</Label>
              <CurrencyInput value={item.icms} onChange={(value) => set({ icms: value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IPI</Label>
              <CurrencyInput value={item.ipi} onChange={(value) => set({ ipi: value })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
            <div>
              <p className="text-xs font-medium text-slate-700">Custo operacional</p>
              <p className="text-[11px] text-slate-500">
                {BRL(billingCfg?.fixed_cost || 0)} • Custo total {BRL(options.total)}
              </p>
            </div>
            <Switch
              checked={item.include_fixed_cost !== false}
              onCheckedChange={(checked) => set({ include_fixed_cost: checked })}
              className="data-[state=checked]:bg-[#6B3FA0]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nível de tecnologia</Label>
            <Select
              value={item.markup_category || ''}
              onValueChange={(value) => set({ markup_category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map((nivel) => {
                  const nivelPct = markupPctFor(billingCfg, nivel);
                  return (
                    <SelectItem key={nivel} value={nivel}>
                      Nível {nivel}
                      {nivelPct !== null ? ` — ${nivelPct}%` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {(options.calculated !== null || options.table !== null) && (
            <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600">
                Preço de venda aplicado (maior valor)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={cn(
                    'rounded-md border px-2 py-1.5',
                    options.source === 'calculado'
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200'
                  )}
                >
                  <p className="text-[10px] text-slate-500">
                    Custo + markup{pct !== null ? ` (${pct}%)` : ''}
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    {options.calculated !== null ? BRL(options.calculated) : '—'}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-md border px-2 py-1.5',
                    options.source === 'referencia'
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200'
                  )}
                >
                  <p className="text-[10px] text-slate-500">Tabela de referência</p>
                  <p className="text-xs font-bold text-slate-800">
                    {options.table !== null ? BRL(options.table) : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Preço de venda final</Label>
              {options.best !== null && Number(item.sale_price) !== options.best && (
                <button
                  type="button"
                  className="text-[11px] text-blue-600 underline"
                  onClick={() => set({ sale_price: options.best })}
                >
                  Aplicar maior valor {BRL(options.best)}
                </button>
              )}
            </div>
            <CurrencyInput value={item.sale_price} onChange={(value) => set({ sale_price: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Garantia</Label>
              <Select
                value={String(item.warranty_years ?? 2)}
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
                value={item.power_type || 'bateria_recarregavel'}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nota fiscal</Label>
              <Input value={item.nota_fiscal_entrada} readOnly className="bg-slate-100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Item da nota</Label>
              <Select
                value={
                  item.xml_index === null || item.xml_index === undefined
                    ? 'none'
                    : String(item.xml_index)
                }
                onValueChange={(value) => {
                  if (value === 'none') {
                    set({ xml_index: null });
                    return;
                  }
                  const xml = xmlItems[Number(value)];
                  const quantity = Number(xml?.quantity) || 1;
                  set({
                    xml_index: Number(value),
                    product_cost: Number((Number(xml.total || 0) / quantity).toFixed(2)),
                    icms: Number((Number(xml.icms || 0) / quantity).toFixed(2)),
                    ipi: Number((Number(xml.ipi || 0) / quantity).toFixed(2)),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não vinculado</SelectItem>
                  {xmlItems.map((xml, xmlIndex) => (
                    <SelectItem key={`${xml.code}-${xmlIndex}`} value={String(xmlIndex)}>
                      {xml.code} — {xml.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}