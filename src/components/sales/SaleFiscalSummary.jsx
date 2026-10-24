import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SaleFiscalSummary({ sale, paymentMethodLabels }) {
  const [warrantyMap, setWarrantyMap] = useState({});
  const [copied, setCopied] = useState(false);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  useEffect(() => {
    const ids = [...new Set((sale?.items || []).map(i => i.product_id).filter(Boolean))];
    if (ids.length === 0) {
      setWarrantyMap({});
      return;
    }
    base44.entities.Product.filter({ id: { $in: ids } })
      .then(products => {
        setWarrantyMap(Object.fromEntries(products.map(p => [p.id, p.warranty_years])));
      })
      .catch(() => setWarrantyMap({}));
  }, [sale]);

  const summaryText = useMemo(() => {
    if (!sale) return '';

    const payments = (sale.payment_details || []).map(p => {
      const label = paymentMethodLabels[p.method] || p.method;
      const installments = p.installments > 1 ? ` ${p.installments}x` : '';
      return `${label}${installments} ${formatCurrency(p.amount)}`;
    });
    const paymentsLine = payments.length > 0
      ? payments.join(' + ')
      : `${formatCurrency(sale.total)}`;

    const productLines = (sale.items || []).map(item => {
      const parts = [`${item.quantity || 1}x ${item.product_name}`];
      if (item.serial_number) parts.push(`NS: ${item.serial_number}`);
      const years = warrantyMap[item.product_id];
      if (years) parts.push(`Garantia: ${years} ${years === 1 ? 'ano' : 'anos'}`);
      return `- ${parts.join(' | ')}`;
    });

    return [
      `Forma de pagamento: ${paymentsLine}`,
      'Produtos:',
      ...productLines
    ].join('\n');
  }, [sale, warrantyMap, paymentMethodLabels]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success('Resumo copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Não foi possível copiar o resumo');
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        Resumo para Nota Fiscal
      </h3>
      <Card className="p-4 border-dashed border-[#6B3FA0]/40 bg-[#6B3FA0]/5">
        <p className="text-xs text-slate-500 mb-2">
          Copie e cole no campo de dados complementares do emissor de nota fiscal.
        </p>
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-800 font-sans bg-white rounded-lg border border-slate-200 p-3">
{summaryText}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full sm:w-auto"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copiado' : 'Copiar resumo'}
        </Button>
      </Card>
    </div>
  );
}