import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Ear } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Card de aparelho associado manualmente (sem venda vinculada).
 * Exibe o selo indicando a origem da associação.
 */
export default function ManualDeviceCard({ product }) {
  return (
    <div className="p-4 rounded-lg border-2 border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
            <Ear className="h-6 w-6 text-[#6B3FA0]" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{product.name}</h4>
            <p className="text-sm text-slate-500">Série: {product.serial_number || '-'}</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex-shrink-0">
          {product.replaced_product_id ? 'Substituição' : 'Associado manualmente'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-500">Data da Associação:</span>
          <p className="font-medium">
            {product.association_date
              ? format(new Date(product.association_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
              : '-'}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Origem:</span>
          <p className="font-medium">Sem venda vinculada</p>
        </div>
      </div>

      <Link
        to={`${createPageUrl('ProductDetail')}?id=${product.id}`}
        className="inline-block mt-3 text-sm font-medium text-[#6B3FA0] hover:underline"
      >
        Ver aparelho
      </Link>
    </div>
  );
}