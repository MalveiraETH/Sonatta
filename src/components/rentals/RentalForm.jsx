import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ClientSearchList from '@/components/inventory/ClientSearchList';
import DevicePicker from '@/components/rentals/DevicePicker';
import { toast } from 'sonner';
import { User } from 'lucide-react';

const paymentMethods = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito'
};

/**
 * Cadastro e edição de locação de AASI.
 * O aparelho é reservado no estoque e as cobranças mensais são geradas na sequência.
 */
export default function RentalForm({ open, onOpenChange, rental, preselectedClient, onSuccess }) {
  const [formData, setFormData] = useState({
    term_type: 'determinado',
    start_date: '',
    end_date: '',
    monthly_amount: 0,
    due_day: 10,
    payment_method: 'pix',
    notes: ''
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [service, setService] = useState(null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!rental;
  const client =
    preselectedClient ||
    selectedClient ||
    (isEdit
      ? {
          id: rental.client_id,
          full_name: rental.client_name,
          cpf: rental.client_cpf,
          phone: rental.client_phone
        }
      : null);

  useEffect(() => {
    if (!open) return;

    setSelectedClient(null);
    setSelectedProduct(null);
    setFormData({
      term_type: rental?.term_type || 'determinado',
      start_date: rental?.start_date || new Date().toISOString().split('T')[0],
      end_date: rental?.end_date || '',
      monthly_amount: rental?.monthly_amount || 0,
      due_day: rental?.due_day || 10,
      payment_method: rental?.payment_method || 'pix',
      notes: rental?.notes || ''
    });

    const loadService = async () => {
      try {
        const services = await base44.entities.Service.list('name', 200);
        const found = services.find((s) => (s.name || '').toLowerCase().includes('loca'));
        setService(found || null);
      } catch (error) {
        console.error(error);
      }
    };

    const loadRentalProduct = async () => {
      if (!rental?.product_id) return;
      try {
        const list = await base44.entities.Product.filter({ id: rental.product_id });
        setSelectedProduct(list[0] || null);
      } catch (error) {
        console.error(error);
      }
    };

    loadService();
    loadRentalProduct();
  }, [open, rental?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!client) {
      toast.error('Selecione o cliente da locação');
      return;
    }
    if (!selectedProduct) {
      toast.error('Selecione o aparelho da locação');
      return;
    }
    if (!formData.start_date) {
      toast.error('Informe a data de início');
      return;
    }
    if (formData.term_type === 'determinado' && !formData.end_date) {
      toast.error('Informe a data de término');
      return;
    }
    if (!formData.monthly_amount || Number(formData.monthly_amount) <= 0) {
      toast.error('Informe o valor mensal');
      return;
    }
    if (!formData.due_day || Number(formData.due_day) < 1 || Number(formData.due_day) > 31) {
      toast.error('Informe um dia de vencimento entre 1 e 31');
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke('salvarLocacao', {
        id: rental?.id,
        client_id: client.id,
        client_name: client.full_name,
        client_cpf: client.cpf || '',
        client_phone: client.phone || '',
        product_id: selectedProduct.id,
        service_id: rental?.service_id || service?.id || '',
        service_name: rental?.service_name || service?.name || '',
        term_type: formData.term_type,
        start_date: formData.start_date,
        end_date: formData.term_type === 'determinado' ? formData.end_date : null,
        monthly_amount: formData.monthly_amount,
        due_day: formData.due_day,
        payment_method: formData.payment_method,
        notes: formData.notes
      });

      const savedRentalId = res?.data?.rental?.id;
      if (!isEdit && savedRentalId) {
        await base44.functions.invoke('gerarCobrancasLocacao', { rental_id: savedRentalId });
      }

      toast.success(
        isEdit ? 'Locação atualizada!' : 'Locação criada e cobranças geradas!'
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar locação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Locação' : 'Nova Locação de AASI'}</DialogTitle>
          <DialogDescription>
            O aparelho fica reservado no estoque enquanto a locação estiver ativa e as cobranças mensais
            são lançadas em Contas a Receber.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {preselectedClient ? (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {preselectedClient.full_name}
                  </p>
                  <p className="text-xs text-slate-500">{preselectedClient.phone || ''}</p>
                </div>
              </div>
            ) : isEdit ? (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <p className="text-sm font-medium text-slate-800 truncate">{rental?.client_name}</p>
              </div>
            ) : (
              <ClientSearchList value={selectedClient} onChange={setSelectedClient} />
            )}
          </div>

          {/* Aparelho */}
          <div className="space-y-2">
            <Label>Aparelho locado *</Label>
            {isEdit ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{rental?.product_name}</p>
                  <p className="text-xs text-slate-500">NS: {rental?.serial_number || '—'}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(selectedProduct ? null : rental)}
                  className="text-[#6B3FA0]"
                >
                  {selectedProduct ? 'Manter aparelho' : 'Trocar aparelho'}
                </Button>
              </div>
            ) : null}
            {(!isEdit || !selectedProduct) && (
              <DevicePicker
                value={selectedProduct}
                onChange={(device) => setSelectedProduct(device)}
                includeProduct={
                  isEdit
                    ? {
                        id: rental.product_id,
                        name: rental.product_name,
                        serial_number: rental.serial_number,
                        reference: rental.product_reference
                      }
                    : null
                }
              />
            )}
          </div>

          {/* Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo da locação *</Label>
              <Select
                value={formData.term_type}
                onValueChange={(v) =>
                  setFormData({ ...formData, term_type: v, end_date: v === 'indeterminado' ? '' : formData.end_date })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="determinado">Prazo definido</SelectItem>
                  <SelectItem value="indeterminado">Prazo indeterminado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Início da locação *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            {formData.term_type === 'determinado' && (
              <div className="space-y-2">
                <Label>Término previsto *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          {/* Cobrança */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor mensal (R$) *</Label>
              <CurrencyInput
                value={formData.monthly_amount}
                onChange={(val) => setFormData({ ...formData, monthly_amount: val })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Dia de vencimento *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethods).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Combinações, acessórios entregues, condições da locação..."
              rows={2}
            />
          </div>

          {service && (
            <p className="text-xs text-slate-500">
              Serviço vinculado: <span className="font-medium">{service.name}</span>
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {saving ? 'Salvando...' : 'Salvar Locação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}