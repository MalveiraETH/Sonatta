import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, Send, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContractGenerator({ open, onOpenChange, sale, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    warranty_period: '12 meses',
    payment_conditions: '',
    notes: ''
  });

  const generateContractNumber = () => {
    const date = new Date();
    return `CTR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getPaymentConditions = () => {
    if (!sale) return '';
    const methods = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      boleto: 'Boleto',
      transferencia: 'Transferência'
    };
    
    let conditions = methods[sale.payment_method] || sale.payment_method;
    if (sale.installments > 1) {
      conditions += ` em ${sale.installments}x de ${formatCurrency(sale.installment_value)}`;
    }
    return conditions;
  };

  const handleGenerate = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      const contractData = {
        contract_number: generateContractNumber(),
        sale_id: sale.id,
        client_id: sale.client_id,
        client_name: sale.client_name,
        client_cpf: sale.client_cpf,
        client_phone: sale.client_phone,
        client_email: sale.client_email,
        client_address: sale.client_address,
        products: sale.items.map(item => ({
          product_name: item.product_name,
          serial_number: item.serial_number || '',
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        total_value: sale.total,
        payment_conditions: formData.payment_conditions || getPaymentConditions(),
        warranty_period: formData.warranty_period,
        status: 'gerado',
        notes: formData.notes
      };

      await base44.entities.Contract.create(contractData);
      toast.success('Contrato gerado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao gerar contrato');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    if (!sale?.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    const phone = sale.client_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${sale.client_name}!\n\nSeu contrato de venda está pronto.\n\nValor: ${formatCurrency(sale.total)}\n\nAgradecemos a preferência!\n\n*Sonatta Soluções Auditivas*`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            Gerar Contrato de Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Dados da Venda */}
          <Card className="p-4 bg-slate-50">
            <h3 className="font-semibold text-slate-800 mb-3">Dados da Venda</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Cliente:</span>
                <p className="font-medium">{sale.client_name}</p>
              </div>
              <div>
                <span className="text-slate-500">CPF:</span>
                <p className="font-medium">{sale.client_cpf || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Nº Venda:</span>
                <p className="font-medium">{sale.sale_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Valor Total:</span>
                <p className="font-medium text-[#1e3a5f]">{formatCurrency(sale.total)}</p>
              </div>
            </div>
          </Card>

          {/* Produtos */}
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Produtos</h3>
            <div className="space-y-2">
              {sale.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    {item.serial_number && (
                      <p className="text-xs text-slate-500">Nº Série: {item.serial_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-slate-500">Qtd: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Configurações do Contrato */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período de Garantia</Label>
              <Input
                value={formData.warranty_period}
                onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })}
                placeholder="Ex: 12 meses"
              />
            </div>
            <div className="space-y-2">
              <Label>Condições de Pagamento</Label>
              <Input
                value={formData.payment_conditions || getPaymentConditions()}
                onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações do Contrato</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={sendWhatsApp}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar Contrato
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}