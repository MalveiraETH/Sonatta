import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Trash2, PackageX } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const reasonLabels = {
  quebra: 'Quebra / Defeito',
  descarte: 'Descarte',
  fim_de_vida: 'Fim de vida útil',
};

const reasonStyles = {
  quebra: 'bg-red-100 text-red-700',
  descarte: 'bg-slate-200 text-slate-700',
  fim_de_vida: 'bg-amber-100 text-amber-700',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function DiscardsTab({ products, currentUser, onViewProduct, onDelete }) {
  const navigate = useNavigate();
  const discarded = products
    .filter((p) => p.status === 'descartado')
    .sort((a, b) => (b.discard_date || '').localeCompare(a.discard_date || ''));

  const totalCost = discarded.reduce((sum, p) => sum + (p.cost_price || 0), 0);

  const handleView = (product) => {
    if (onViewProduct) {
      onViewProduct(product);
    } else {
      navigate(`${createPageUrl('ProductDetail')}?id=${product.id}`, {
        state: { fromInventory: true, activeTab: 'discards' },
      });
    }
  };

  if (discarded.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500">
        <PackageX className="h-10 w-10 mx-auto mb-2 text-slate-300" />
        <p className="font-medium">Nenhum aparelho dado baixa</p>
        <p className="text-sm text-slate-400 mt-1">
          Aparelhos descartados aparecerão aqui para auditoria
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <p className="text-sm text-slate-600">
            Aparelhos descartados — registro mantido para auditoria
          </p>
          <p className="text-xs text-slate-400">
            {discarded.length} {discarded.length === 1 ? 'aparelho' : 'aparelhos'} • Custo total baixado: {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Produto</TableHead>
              <TableHead>NS</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Data Baixa</TableHead>
              <TableHead>NF / Protocolo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discarded.map((product) => (
              <TableRow key={product.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-sm text-slate-600">{product.serial_number || '-'}</TableCell>
                <TableCell className="text-sm">
                  {product.brand || ''} {product.model || ''}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      reasonStyles[product.discard_reason] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {reasonLabels[product.discard_reason] || product.discard_reason || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {product.discard_date ? formatLocalDate(product.discard_date) : '-'}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {product.discard_protocol || '-'}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {product.discarded_by_name || '-'}
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-500">
                  {formatCurrency(product.cost_price)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(product)}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {currentUser?.role === 'admin' && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product)}
                        className="text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {discarded.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                  <p className="text-sm text-slate-600">NS: {product.serial_number || '-'}</p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    reasonStyles[product.discard_reason] || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {reasonLabels[product.discard_reason] || '-'}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                {product.brand || ''} {product.model || ''}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                <span>Data: <strong className="text-slate-700">{product.discard_date ? formatLocalDate(product.discard_date) : '-'}</strong></span>
                <span>Resp: <strong className="text-slate-700">{product.discarded_by_name || '-'}</strong></span>
                {product.discard_protocol && (
                  <span className="col-span-2">NF/Protocolo: <strong className="text-slate-700">{product.discard_protocol}</strong></span>
                )}
              </div>
              {product.discard_notes && (
                <p className="text-xs text-slate-500 italic">"{product.discard_notes}"</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-slate-500">
                  Custo: <strong className="text-slate-700">{formatCurrency(product.cost_price)}</strong>
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleView(product)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {currentUser?.role === 'admin' && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(product)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}