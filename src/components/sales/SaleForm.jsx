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

export default function SaleForm({ open, onOpenChange, sale, quote, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date());
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
    payment_details: [],
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
      setSaleDate(sale.sale_date ? new Date(sale.sale_date) : new Date(sale.created_date));
      // Calcular percentual inicial se houver desconto
      if (sale.subtotal > 0 && sale.discount > 0) {
        setDiscountPercent(((sale.discount / sale.subtotal) * 100).toFixed(2));
      } else {
        setDiscountPercent(0);
      }
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
        payment_details: quote.payment_details || [],
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        nota_fiscal: ''
      });
      setSaleDate(new Date(quote.created_date));
      // Calcular percentual do orçamento
      if (quote.subtotal > 0 && quote.discount > 0) {
        setDiscountPercent(((quote.discount / quote.subtotal) * 100).toFixed(2));
      } else {
        setDiscountPercent(0);
      }
    } else if (preselectedClient) {
      setFormData({
        client_id: preselectedClient.id,
        client_name: preselectedClient.full_name,
        client_cpf: preselectedClient.cpf || '',
        client_phone: preselectedClient.phone || '',
        client_email: preselectedClient.email || '',
        client_address: preselectedClient.address || '',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        payment_details: [],
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        status: 'pendente',
        notes: '',
        quote_id: '',
        nota_fiscal: ''
      });
      setSaleDate(new Date());
      setDiscountPercent(0);
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
        payment_details: [],
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || '',
        status: 'pendente',
        notes: '',
        quote_id: '',
        nota_fiscal: ''
      });
      setSaleDate(new Date());
      setDiscountPercent(0);
    }
  }, [sale, quote, preselectedClient, open, currentUser]);

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
      items: [{ product_id: '', product_name: '', brand: '', model: '', serial_number: '', quantity: 1, unit_price: 0, total: 0 }, ...formData.items]
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

  const generateSaleNumber = () => {
    return `VND-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const addPayment = () => {
    setFormData({
      ...formData,
      payment_details: [{ method: 'pix', amount: 0, installments: 1, status: 'pendente' }, ...formData.payment_details]
    });
  };

  const removePayment = (index) => {
    const newPayments = formData.payment_details.filter((_, i) => i !== index);
    setFormData({ ...formData, payment_details: newPayments });
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...formData.payment_details];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setFormData({ ...formData, payment_details: newPayments });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || formData.items.length === 0 || formData.payment_details.length === 0) {
      toast.error('Preencha todos os campos obrigatórios e adicione pelo menos uma forma de pagamento');
      return;
    }

    // Validar soma dos pagamentos
    const totalPayments = formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (Math.abs(totalPayments - formData.total) > 0.02) {
      toast.error(`Total dos pagamentos (${formatCurrency(totalPayments)}) não corresponde ao total da venda (${formatCurrency(formData.total)})`);
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
        sale_number: formData.sale_number || generateSaleNumber(),
        sale_date: format(saleDate, 'yyyy-MM-dd')
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
      
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao processar venda: ${error.message || 'Tente novamente'}`);
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
    pix: 'PIX à Vista',
    pix_parcelado: 'PIX Parcelado',
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
          {/* Data e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Venda *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(saleDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={(date) => setSaleDate(date || new Date())}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="relative">
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
                  list="clients-list"
                  disabled={!!quote}
                />
                <datalist id="clients-list">
                  {clients.map((client) => (
                    <option key={client.id} value={client.full_name}>
                      {client.full_name}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Produtos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!!quote}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Produto
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-11">
                      <Label className="text-xs">Buscar por Número de Série</Label>
                      <Input
                        placeholder="Digite o número de série..."
                        value={item.serial_number || ''}
                        onChange={(e) => {
                          const searchTerm = e.target.value.toLowerCase();
                          const foundProduct = products.find(p => 
                            p.serial_number?.toLowerCase().includes(searchTerm) && 
                            p.status === 'disponivel'
                          );
                          if (foundProduct && searchTerm.length > 2) {
                            updateItem(index, 'product_id', foundProduct.id);
                          } else {
                            const newItems = [...formData.items];
                            newItems[index].serial_number = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }
                        }}
                        disabled={!!quote}
                        list={`serial-list-${index}`}
                      />
                      <datalist id={`serial-list-${index}`}>
                        {products.filter(p => p.status === 'disponivel').map((product) => (
                          <option key={product.id} value={product.serial_number}>
                            {product.name} ({product.brand} {product.model})
                          </option>
                        ))}
                      </datalist>
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
                    <div className="grid grid-cols-3 gap-3 text-sm bg-slate-50 p-3 rounded-lg">
                      <div>
                        <span className="text-slate-500">Produto:</span>
                        <p className="font-medium">{item.product_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Marca/Modelo:</span>
                        <p className="font-medium">{item.brand} {item.model}</p>
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
                  disabled={!!quote}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total</Label>
                <p className="text-xl font-bold text-[#1e3a5f]">{formatCurrency(formData.total)}</p>
              </div>
            </div>
          </Card>

          {/* Formas de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Formas de Pagamento *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pagamento
              </Button>
            </div>

            {formData.payment_details.map((payment, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Método</Label>
                    <Select
                      value={payment.method}
                      onValueChange={(value) => updatePayment(index, 'method', value)}
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
                  <div className="col-span-3">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, 'amount', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  {(payment.method === 'pix_parcelado' || payment.method === 'cartao_credito') && (
                    <div className="col-span-3">
                      <Label className="text-xs">Parcelas</Label>
                      <Select
                        value={String(payment.installments)}
                        onValueChange={(value) => updatePayment(index, 'installments', Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}x de {formatCurrency(payment.amount / n)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {formData.payment_details.length > 0 && (
              <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded">
                Total pago: {formatCurrency(formData.payment_details.reduce((sum, p) => sum + (p.amount || 0), 0))} 
                {Math.abs(formData.payment_details.reduce((sum, p) => sum + (p.amount || 0), 0) - formData.total) > 0.01 && (
                  <span className="text-red-600 ml-2 font-medium">
                    (diferença: {formatCurrency(formData.total - formData.payment_details.reduce((sum, p) => sum + (p.amount || 0), 0))})
                  </span>
                )}
              </div>
            )}
          </div>

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