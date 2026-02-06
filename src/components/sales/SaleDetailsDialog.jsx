import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import { 
  User, 
  Calendar, 
  Package, 
  CreditCard, 
  FileText,
  MapPin,
  Phone,
  Mail,
  Hash
} from 'lucide-react';

export default function SaleDetailsDialog({ open, onOpenChange, sale }) {
  if (!sale) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const paymentMethodLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX à Vista',
    pix_parcelado: 'PIX Parcelado',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
  };

  const statusColors = {
    pago: 'bg-emerald-100 text-emerald-700',
    pendente: 'bg-amber-100 text-amber-700',
    cancelado: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    pago: 'Pago',
    pendente: 'Pendente',
    cancelado: 'Cancelado'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Venda</span>
            <Badge className={statusColors[sale.status]}>
              {statusLabels[sale.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Informações Básicas */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Nº da Venda</p>
                  <p className="font-semibold text-slate-900">{sale.sale_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Data da Venda</p>
                  <p className="font-semibold text-slate-900">
                    {formatLocalDate(sale.sale_date || sale.created_date)}
                  </p>
                </div>
              </div>
              {sale.nota_fiscal && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Nota Fiscal</p>
                    <p className="font-semibold text-slate-900">{sale.nota_fiscal}</p>
                  </div>
                </div>
              )}
              {sale.seller_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Vendedor</p>
                    <p className="font-semibold text-slate-900">{sale.seller_name}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Informações do Cliente */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </h3>
            <Card className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{sale.client_name}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {sale.client_cpf && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Hash className="h-4 w-4" />
                      <span>CPF: {sale.client_cpf}</span>
                    </div>
                  )}
                  {sale.client_phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4" />
                      <span>{sale.client_phone}</span>
                    </div>
                  )}
                  {sale.client_email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-4 w-4" />
                      <span>{sale.client_email}</span>
                    </div>
                  )}
                  {sale.client_address && (
                    <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
                      <MapPin className="h-4 w-4" />
                      <span>{sale.client_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Produtos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos ({sale.items?.length || 0})
            </h3>
            <div className="space-y-2">
              {sale.items?.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{item.product_name}</p>
                      {item.serial_number && (
                        <p className="text-sm text-slate-600">NS: {item.serial_number}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {item.quantity}x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Totais */}
          <Card className="p-4 bg-slate-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Desconto:</span>
                  <span className="font-semibold text-red-600">- {formatCurrency(sale.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold text-slate-900">Total:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </Card>

          {/* Pagamentos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Formas de Pagamento
            </h3>
            <div className="space-y-2">
              {sale.payment_details?.map((payment, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {paymentMethodLabels[payment.method] || payment.method}
                      </p>
                      {payment.installments > 1 && (
                        <p className="text-sm text-slate-600">
                          {payment.installments}x de {formatCurrency(payment.amount / payment.installments)}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">{formatCurrency(payment.amount)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Observações */}
          {sale.notes && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Observações</h3>
              <Card className="p-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{sale.notes}</p>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}