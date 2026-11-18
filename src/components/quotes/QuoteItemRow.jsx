import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { Trash2 } from 'lucide-react';

/**
 * Linha de item do orçamento.
 * Valor unitário e Total do item são editáveis: digitar um recalcula o outro.
 */
export default function QuoteItemRow({ item, index, referenceProducts, onUpdate, onRemove, onProductNameChange, formatCurrency }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Item {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Aparelho</Label>
          <Input
            placeholder="Digite o nome do aparelho..."
            value={item.product_name || ''}
            onChange={(e) => onProductNameChange(index, e.target.value)}
            list={`product-list-${index}`}
          />
          <datalist id={`product-list-${index}`}>
            {referenceProducts.map((product) => (
              <option key={product.id} value={product.name}>
                {product.name} - Cat. {product.category} - {formatCurrency(product.finalPrice)}
              </option>
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Qtd</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={item.quantity ? item.quantity : ''}
              placeholder="1"
              onFocus={(e) => e.target.select()}
              onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label className="text-xs">Valor Unit.</Label>
            <CurrencyInput
              value={item.unit_price}
              onChange={(val) => onUpdate(index, 'unit_price', val)}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Total do Item</Label>
            <CurrencyInput
              value={item.total}
              onChange={(val) => onUpdate(index, 'total', val)}
              className="font-semibold border-[#6B3FA0]/40 bg-[#6B3FA0]/5"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}