import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuoteForm({ open, onOpenChange, quote, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_cpf: '',
    client_phone: '',
    client_email: '',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    installments: 1,
    installment_value: 0,
    validity_days: 30,
    status: 'rascunho',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (quote) {
      setFormData({
        ...quote,
        items: quote.items || []
      });
    } else if (preselectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: preselectedClient.id,
        client_name: preselectedClient.full_name,
        client_cpf: preselectedClient.cpf || '',
        client_phone: preselectedClient.phone || '',
        client_email: preselectedClient.email || '',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        installments: 1,
        installment_value: 0
      }));
    } else {
      setFormData({
        client_id: '',
        client_name: '',
        client_cpf: '',
        client_phone: '',
        client_email: '',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        installments: 1,
        installment_value: 0,
        validity_days: 30,
        status: 'rascunho',
        notes: ''
      });
    }
  }, [quote, preselectedClient, open]);

  const loadData = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Product.list()
      ]);
      setClients(clientsData);
      setProducts(productsData.filter(p => p.quantity > 0 || p.status !== 'esgotado'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        client_id: clientId,
        client_name: client.full_name,
        client_cpf: client.cpf || '',
        client_phone: client.phone || '',
        client_email: client.email || ''
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    recalculateTotals(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.sale_price;
        newItems[index].total = product.sale_price * newItems[index].quantity;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    recalculateTotals(newItems);
  };

  const recalculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const total = subtotal - formData.discount;
    const installment_value = total / formData.installments;

    setFormData({
      ...formData,
      items,
      subtotal,
      total,
      installment_value
    });
  };

  const updateDiscount = (discountPercent) => {
    const discountValue = (formData.subtotal * discountPercent) / 100;
    const total = formData.subtotal - discountValue;
    const installment_value = total / formData.installments;
    setFormData({
      ...formData,
      discount: discountValue,
      total,
      installment_value
    });
  };

  const updateInstallments = (installments) => {
    const installment_value = formData.total / installments;
    setFormData({
      ...formData,
      installments,
      installment_value
    });
  };

  const generateQuoteNumber = () => {
    const date = new Date();
    return `ORC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || formData.items.length === 0) {
      toast.error('Selecione um cliente e adicione itens');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        quote_number: formData.quote_number || generateQuoteNumber()
      };

      if (quote) {
        await base44.entities.Quote.update(quote.id, dataToSave);
        toast.success('Orçamento atualizado!');
      } else {
        await base44.entities.Quote.create(dataToSave);
        toast.success('Orçamento criado!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {quote ? 'Editar Orçamento' : 'Novo Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={handleClientChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens do Orçamento</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Produto</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.sale_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input value={formatCurrency(item.total)} readOnly className="bg-slate-50" />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Totais */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Subtotal</Label>
                <p className="text-lg font-semibold">{formatCurrency(formData.subtotal)}</p>
              </div>
              <div>
                <Label className="text-xs">Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.subtotal > 0 ? ((formData.discount / formData.subtotal) * 100).toFixed(2) : 0}
                  onChange={(e) => updateDiscount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Parcelas</Label>
                <Select
                  value={String(formData.installments)}
                  onValueChange={(value) => updateInstallments(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total</Label>
                <p className="text-xl font-bold text-[#1e3a5f]">{formatCurrency(formData.total)}</p>
                {formData.installments > 1 && (
                  <p className="text-xs text-slate-500">
                    {formData.installments}x de {formatCurrency(formData.installment_value)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações do orçamento"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {quote ? 'Salvar' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}