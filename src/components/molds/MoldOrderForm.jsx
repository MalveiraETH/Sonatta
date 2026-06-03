import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FLOW = [
  { value: 'impressao_coletada', label: 'Impressão Coletada' },
  { value: 'enviado_ao_fornecedor', label: 'Enviado ao Fornecedor' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'entregue_ao_cliente', label: 'Entregue ao Cliente' },
  { value: 'cancelado', label: 'Cancelado' },
];

const emptyForm = () => ({
  product_type: 'molde',
  ear_side: 'bilateral',
  color: '',
  model_spec: '',
  supplier_name: '',
  supplier_invoice: '',
  cost_price: 0,
  sale_price: 0,
  status: 'impressao_coletada',
  date_impression: new Date().toISOString().split('T')[0],
  date_sent: '',
  date_received: '',
  date_delivered: '',
  notes: '',
});

export default function MoldOrderForm({ open, onOpenChange, order, preselectedClient, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');

  useEffect(() => {
    const load = async () => {
      const [cls, profs] = await Promise.all([
        base44.entities.Client.list('-created_date', 200),
        base44.entities.Professional.list('-created_date', 50),
      ]);
      setClients(cls);
      setProfessionals(profs);
    };
    load();
  }, []);

  useEffect(() => {
    if (order) {
      setFormData({
        product_type: order.product_type || 'molde',
        ear_side: order.ear_side || 'bilateral',
        color: order.color || '',
        model_spec: order.model_spec || '',
        supplier_name: order.supplier_name || '',
        supplier_invoice: order.supplier_invoice || '',
        cost_price: order.cost_price || 0,
        sale_price: order.sale_price || 0,
        status: order.status || 'impressao_coletada',
        date_impression: order.date_impression || new Date().toISOString().split('T')[0],
        date_sent: order.date_sent || '',
        date_received: order.date_received || '',
        date_delivered: order.date_delivered || '',
        notes: order.notes || '',
      });
      setSelectedClientId(order.client_id || '');
      setSelectedProfId(order.professional_id || '');
    } else {
      setFormData(emptyForm());
      setSelectedClientId(preselectedClient?.id || '');
      setSelectedProfId('');
    }
  }, [order, open, preselectedClient]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) { toast.error('Selecione o cliente'); return; }
    setLoading(true);

    const client = clients.find(c => c.id === selectedClientId);
    const prof = professionals.find(p => p.id === selectedProfId);

    const data = {
      ...formData,
      client_id: selectedClientId,
      client_name: client?.full_name || '',
      client_phone: client?.phone || '',
      professional_id: selectedProfId || '',
      professional_name: prof?.full_name || '',
      cost_price: Number(formData.cost_price) || 0,
      sale_price: Number(formData.sale_price) || 0,
    };

    // Limpar datas vazias
    ['date_sent', 'date_received', 'date_delivered'].forEach(f => {
      if (!data[f]) delete data[f];
    });

    try {
      if (order) {
        await base44.entities.MoldOrder.update(order.id, data);
        toast.success('Ordem atualizada!');
      } else {
        // Gerar número de ordem
        const count = await base44.entities.MoldOrder.list('-created_date', 1);
        const num = String((count.length > 0 ? parseInt(count[0].order_number?.replace(/\D/g, '') || '0') : 0) + 1).padStart(4, '0');
        data.order_number = `MOL-${num}`;
        await base44.entities.MoldOrder.create(data);
        toast.success('Ordem criada!');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Editar Ordem' : 'Nova Ordem de Molde / Tampão'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Cliente */}
          {!preselectedClient && (
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo + Orelha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={formData.product_type} onValueChange={v => set('product_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="molde">Molde</SelectItem>
                  <SelectItem value="tampao_silicone">Tampão de Silicone</SelectItem>
                  <SelectItem value="molde_e_tampao">Molde + Tampão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orelha *</Label>
              <Select value={formData.ear_side} onValueChange={v => set('ear_side', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direito">Direita</SelectItem>
                  <SelectItem value="esquerdo">Esquerda</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cor + Especificação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input value={formData.color} onChange={e => set('color', e.target.value)} placeholder="Ex: Transparente, Bege..." />
            </div>
            <div className="space-y-2">
              <Label>Especificação / Tipo</Label>
              <Input value={formData.model_spec} onChange={e => set('model_spec', e.target.value)} placeholder="Ex: CIC, BTE, Receptor..." />
            </div>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label>Profissional Responsável</Label>
            <Select value={selectedProfId} onValueChange={setSelectedProfId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Nenhum —</SelectItem>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor + NF */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={formData.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="Nome do fornecedor" />
            </div>
            <div className="space-y-2">
              <Label>NF do Fornecedor</Label>
              <Input value={formData.supplier_invoice} onChange={e => set('supplier_invoice', e.target.value)} placeholder="Número da NF" />
            </div>
          </div>

          {/* Custo + Venda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo (R$)</Label>
              <Input type="number" min="0" step="0.01" value={formData.cost_price} onChange={e => set('cost_price', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor Cobrado do Cliente (R$)</Label>
              <Input type="number" min="0" step="0.01" value={formData.sale_price} onChange={e => set('sale_price', e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Impressão *</Label>
              <Input type="date" value={formData.date_impression} onChange={e => set('date_impression', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data de Envio ao Fornecedor</Label>
              <Input type="date" value={formData.date_sent} onChange={e => set('date_sent', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Recebimento</Label>
              <Input type="date" value={formData.date_received} onChange={e => set('date_received', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrega ao Cliente</Label>
              <Input type="date" value={formData.date_delivered} onChange={e => set('date_delivered', e.target.value)} />
            </div>
          </div>

          {/* Obs */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Observações adicionais..." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {order ? 'Salvar' : 'Criar Ordem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}