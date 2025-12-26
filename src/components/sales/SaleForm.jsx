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

export default function SaleForm({ open, onOpenChange, sale, quote, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_cpf: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    payment_method: 'pix',
    installments: 1,
    installment_value: 0,
    seller_id: '',
    seller_name: '',
    status: 'pendente',
    notes: '',
    quote_id: '',
    nota_fiscal: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (sale) {
      setFormData({ ...sale });
    } else if (quote) {
      // Converter orçamento em venda
      setFormData({
        ...formData,
        quote_id: quote.id,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_cpf: quote.client_cpf || '',
        client_phone: quote.client_phone || '',
        client_email: quote.client_email || '',
        items: quote.items || [],
        subtotal: quote.subtotal,
        discount: quote.discount || 0,
        total: quote.total,
        installments: quote.installments || 1,
        installment_value: quote.installment_value || quote.total,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        nota_fiscal: ''
      });
    } else {
      setFormData({
        client_id: '',
        client_name: '',
        client_cpf: '',
        client_phone: '',
        client_email: '',
        client_address: '',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        payment_method: 'pix',
        installments: 1,
        installment_value: 0,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        status: 'pendente',
        notes: '',
        quote_id: '',
        nota_fiscal: ''
      });
    }
  }, [sale, quote, open, currentUser]);

  const loadData = async () => {
    try {
      const [clientsData, productsData, user] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Product.list(),
        base44.auth.me()
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setCurrentUser(user);
      
      if (!sale && !quote) {
        setFormData(prev => ({
          ...prev,
          seller_id: user.id,
          seller_name: user.full_name
        }));
      }
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
        client_email: client.email || '',
        client_address: client.address || ''
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', brand: '', model: '', serial_number: '', quantity: 1, unit_price: 0, total: 0 }]
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
        // Verificar se o produto já foi vendido
        if (product.status === 'vendido') {
          toast.error(`O produto ${product.name} (${product.serial_number}) já foi vendido!`);
          return;
        }
        
        newItems[index].product_name = product.name;
        newItems[index].brand = product.brand || '';
        newItems[index].model = product.model || '';
        newItems[index].unit_price = product.sale_price;
        newItems[index].serial_number = product.serial_number || '';
        newItems[index].quantity = 1;
        newItems[index].total = product.sale_price;
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

  const updateDiscount = (discount) => {
    const total = formData.subtotal - discount;
    const installment_value = total / formData.installments;
    setFormData({
      ...formData,
      discount,
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

  const generateSaleNumber = () => {
    const date = new Date();
    return `VND-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || formData.items.length === 0 || !formData.payment_method) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Verificar se produtos já foram vendidos
    for (const item of formData.items) {
      const product = products.find(p => p.id === item.product_id);
      if (product && product.status === 'vendido') {
        toast.error(`O produto ${product.name} (${product.serial_number}) já foi vendido!`);
        return;
      }
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        sale_number: formData.sale_number || generateSaleNumber()
      };

      if (sale) {
        await base44.entities.Sale.update(sale.id, dataToSave);
        toast.success('Venda atualizada!');
      } else {
        // Criar venda
        await base44.entities.Sale.create(dataToSave);

        // Atualizar estoque - marcar como vendido
        for (const item of formData.items) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            await base44.entities.Product.update(product.id, {
              status: 'vendido'
            });

            // Registrar movimentação
            await base44.entities.StockMovement.create({
              product_id: product.id,
              product_name: product.name,
              type: 'saida',
              quantity: 1,
              reason: `Venda ${dataToSave.sale_number}`
            });
          }
        }

        // Atualizar status do orçamento se veio de um
        if (formData.quote_id) {
          await base44.entities.Quote.update(formData.quote_id, { status: 'convertido' });
        }

        // Atualizar status do cliente
        const client = clients.find(c => c.id === formData.client_id);
        if (client && client.status !== 'cliente_ativo') {
          await base44.entities.Client.update(client.id, { status: 'cliente_ativo' });
        }

        toast.success('Venda registrada com sucesso!');
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao processar venda');
      console.error(error);
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

  const paymentMethods = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {sale ? 'Editar Venda' : 'Nova Venda'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={handleClientChange}
              disabled={!!quote}
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
              <Label>Itens da Venda</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!!quote}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-11">
                      <Label className="text-xs">Produto (Número de Série)</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => updateItem(index, 'product_id', value)}
                        disabled={!!quote}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione pelo número de série" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.status === 'disponivel').map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.serial_number} - {product.name} ({product.brand} {product.model})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={!!quote}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {item.product_id && (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Marca/Modelo:</span>
                        <p className="font-medium">{item.brand} {item.model}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Série:</span>
                        <p className="font-medium">{item.serial_number}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Valor:</span>
                        <p className="font-bold text-[#1e3a5f]">{formatCurrency(item.unit_price)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagamento */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Subtotal</Label>
                <p className="text-lg font-semibold">{formatCurrency(formData.subtotal)}</p>
              </div>
              <div>
                <Label className="text-xs">Desconto</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => updateDiscount(Number(e.target.value))}
                  disabled={!!quote}
                />
              </div>
              <div>
                <Label className="text-xs">Pagamento *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethods).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número da Nota Fiscal</Label>
              <Input
                value={formData.nota_fiscal}
                onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                placeholder="Número da NF (opcional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações da venda"
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
              {sale ? 'Salvar' : 'Finalizar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}