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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logCreation, logEdit } from '@/components/utils/auditLogger';

export default function QuoteForm({ open, onOpenChange, quote, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [referenceProducts, setReferenceProducts] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [quoteDate, setQuoteDate] = useState(new Date());
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
    // Subscribe to ReferenceProduct changes to reload products in real-time
    const unsubscribeProducts = base44.entities.ReferenceProduct.subscribe(() => {
      if (open) {
        loadData();
      }
    });

    // Subscribe to AppSettings changes to reload billing config in real-time
    const unsubscribeSettings = base44.entities.AppSettings.subscribe((event) => {
      if (event.data?.setting_key === 'billing_config' && open) {
        loadData();
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, [open]);

  useEffect(() => {
    if (quote) {
      setFormData({
        ...quote,
        items: quote.items || []
      });
      // Calcular percentual inicial se houver desconto
      if (quote.subtotal > 0 && quote.discount > 0) {
        setDiscountPercent(((quote.discount / quote.subtotal) * 100).toFixed(2));
      } else {
        setDiscountPercent(0);
      }
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
        total: 0
      }));
      setDiscountPercent(0);
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
        validity_days: 30,
        status: 'rascunho',
        notes: ''
      });
      setDiscountPercent(0);
    }
  }, [quote, preselectedClient, open]);

  const loadData = async () => {
    try {
      const [clientsData, refProductsData, settingsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.ReferenceProduct.list(),
        base44.entities.AppSettings.filter({ setting_key: 'billing_config' })
      ]);
      setClients(clientsData);
      
      // Buscar configurações globais
      const billingConfig = (settingsData.length > 0 && settingsData[0].setting_value) || {};
      
      // Calcular valor final de cada produto referência usando configurações globais
      const productsWithPrice = refProductsData.map(p => {
        const fixedCost = billingConfig.fixed_cost || 0;
        const totalCost = p.cost + fixedCost;
        const markup = billingConfig[`markup_category_${p.category}`] || 0;
        const finalPrice = totalCost + (totalCost * (markup / 100));
        
        return {
          ...p,
          finalPrice
        };
      });
      
      setReferenceProducts(productsWithPrice);
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
      const product = referenceProducts.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.finalPrice;
        newItems[index].total = product.finalPrice * newItems[index].quantity;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    recalculateTotals(newItems);
  };

  const recalculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountValue = (subtotal * discountPercent) / 100;
    const total = subtotal - discountValue;

    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      discount: discountValue,
      total
    }));
  };

  const updateDiscount = (percent) => {
    setDiscountPercent(percent);
    const discountValue = (formData.subtotal * percent) / 100;
    const total = formData.subtotal - discountValue;
    setFormData(prev => ({
      ...prev,
      discount: discountValue,
      total
    }));
  };

  const generateQuoteNumber = () => {
    return `ORC-${quoteDate.getFullYear()}${String(quoteDate.getMonth() + 1).padStart(2, '0')}${String(quoteDate.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const paymentMethods = {
    dinheiro: 'Dinheiro',
    pix: 'PIX à Vista',
    pix_parcelado: 'PIX Parcelado',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
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
        quote_number: formData.quote_number || generateQuoteNumber(),
        status: 'criado'
      };

      if (quote) {
        await base44.entities.Quote.update(quote.id, dataToSave);
        await logEdit('Orçamento', `${dataToSave.quote_number} - ${dataToSave.client_name}`, quote.id);
        toast.success('Orçamento atualizado!');
      } else {
        await base44.entities.Quote.create(dataToSave);
        await logCreation('Orçamento', `${dataToSave.quote_number} - ${dataToSave.client_name}`, dataToSave.quote_number);
        toast.success('Orçamento criado!');
      }
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao salvar orçamento: ${error.message || 'Tente novamente'}`);
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
          {/* Data e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do Orçamento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(quoteDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={quoteDate}
                    onSelect={(date) => setQuoteDate(date || new Date())}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                placeholder="Digite o nome do cliente..."
                value={formData.client_name || ''}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  setFormData({ ...formData, client_name: searchValue, client_id: '' });
                  
                  const searchTerm = searchValue.toLowerCase();
                  const found = clients.find(c => 
                    c.full_name?.toLowerCase() === searchTerm
                  );
                  if (found) {
                    handleClientChange(found.id);
                  }
                }}
                list="clients-list-quote"
              />
              <datalist id="clients-list-quote">
                {clients.map((client) => (
                  <option key={client.id} value={client.full_name}>
                    {client.full_name}
                  </option>
                ))}
              </datalist>
            </div>
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
                    <Label className="text-xs">Nome do Aparelho</Label>
                    <Input
                      placeholder="Digite o nome do aparelho..."
                      value={item.product_name || ''}
                      onChange={(e) => {
                        const searchValue = e.target.value;
                        const newItems = [...formData.items];
                        newItems[index].product_name = searchValue;
                        setFormData({ ...formData, items: newItems });
                        
                        const searchTerm = searchValue.toLowerCase();
                        const foundProduct = referenceProducts.find(p => 
                          p.name?.toLowerCase() === searchTerm
                        );
                        if (foundProduct) {
                          updateItem(index, 'product_id', foundProduct.id);
                        }
                      }}
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
            <div className="grid grid-cols-3 gap-4">
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
                  value={discountPercent}
                  onChange={(e) => updateDiscount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total</Label>
                <p className="text-xl font-bold text-[#1e3a5f]">{formatCurrency(formData.total)}</p>
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