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
import { logCreation } from '@/components/utils/auditLogger';

export default function NewSaleForm({ open, onOpenChange, sale, quote, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date());
  const [firstDueDate, setFirstDueDate] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_cpf: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    test_referral_id: '',
    test_referral_name: '',
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
    nota_fiscal: '',
    category_id: '',
    category_name: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (preselectedClient) {
      loadClientReferral(preselectedClient.id);
    }
  }, [preselectedClient, open, currentUser]);

  const loadClientReferral = async (clientId) => {
    try {
      const appointments = await base44.entities.Appointment.filter({ client_id: clientId }, '-created_date', 1);
      const latestAppointment = appointments[0];
      
      setFormData({
        client_id: preselectedClient.id,
        client_name: preselectedClient.full_name,
        client_cpf: preselectedClient.cpf || '',
        client_phone: preselectedClient.phone || '',
        client_email: preselectedClient.email || '',
        client_address: preselectedClient.address || '',
        test_referral_id: latestAppointment?.test_referral_id || '',
        test_referral_name: latestAppointment?.test_referral_name || '',
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
      setDiscountPercent(0);
    } catch (e) {
      console.error(e);
      setFormData({
        client_id: preselectedClient.id,
        client_name: preselectedClient.full_name,
        client_cpf: preselectedClient.cpf || '',
        client_phone: preselectedClient.phone || '',
        client_email: preselectedClient.email || '',
        client_address: preselectedClient.address || '',
        test_referral_id: '',
        test_referral_name: '',
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
      setDiscountPercent(0);
    }
  };

  const loadData = async () => {
    try {
      const [clientsData, productsData, categoriesData, user] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Product.list(),
        base44.entities.ExpenseCategory.filter({ type: 'receita' }),
        base44.auth.me()
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setCategories(categoriesData);
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

  const handleClientChange = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      try {
        const appointments = await base44.entities.Appointment.filter({ client_id: clientId }, '-created_date', 1);
        const latestAppointment = appointments[0];
        
        setFormData({
          ...formData,
          client_id: clientId,
          client_name: client.full_name,
          client_cpf: client.cpf || '',
          client_phone: client.phone || '',
          client_email: client.email || '',
          client_address: client.address || '',
          test_referral_id: latestAppointment?.test_referral_id || '',
          test_referral_name: latestAppointment?.test_referral_name || ''
        });
      } catch (e) {
        console.error(e);
        setFormData({
          ...formData,
          client_id: clientId,
          client_name: client.full_name,
          client_cpf: client.cpf || '',
          client_phone: client.phone || '',
          client_email: client.email || '',
          client_address: client.address || '',
          test_referral_id: '',
          test_referral_name: ''
        });
      }
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [{ product_id: '', product_name: '', brand: '', model: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, stock_type: '' }, ...formData.items]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    recalculateTotals(newItems, formData.payment_details);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        // Verificar disponibilidade
        if (product.stock_type === 'serializado' && product.status === 'vendido') {
          toast.error(`O produto ${product.name} (${product.serial_number}) já foi vendido!`);
          return;
        }
        if (product.stock_type === 'nao_serializado' && product.quantity <= 0) {
          toast.error(`O produto ${product.name} está sem estoque!`);
          return;
        }
        
        newItems[index].product_name = product.name;
        newItems[index].brand = product.brand || '';
        newItems[index].model = product.model || '';
        newItems[index].unit_price = product.sale_price;
        newItems[index].serial_number = product.serial_number || '';
        newItems[index].stock_type = product.stock_type;
        newItems[index].quantity = 1;
        newItems[index].total = product.sale_price;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    recalculateTotals(newItems, formData.payment_details);
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

  const recalculateTotals = (items, payments) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || formData.items.length === 0 || formData.payment_details.length === 0) {
      toast.error('Preencha todos os campos obrigatórios e adicione pelo menos uma forma de pagamento');
      return;
    }

    // Validar soma dos pagamentos
    const totalPayments = formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const hasDifference = Math.abs(totalPayments - formData.total) > 0.02;
    
    // Se houver diferença, exigir justificativa
    if (hasDifference && !formData.notes?.trim()) {
      toast.error('O valor dos pagamentos difere do total da venda. Por favor, adicione uma justificativa no campo de observações.');
      return;
    }

    // Verificar se produtos já foram vendidos ou sem estoque
    for (const item of formData.items) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        if (product.stock_type === 'serializado' && product.status === 'vendido') {
          toast.error(`O produto ${product.name} (${product.serial_number}) já foi vendido!`);
          return;
        }
        if (product.stock_type === 'nao_serializado' && product.quantity < item.quantity) {
          toast.error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const saleNumber = formData.sale_number || generateSaleNumber();
      // Definir status inicial baseado no método de pagamento
      const hasPixParcelado = formData.payment_details.some(pd => pd.method === 'pix_parcelado');
      const initialStatus = hasPixParcelado ? 'pendente' : 'pago';

      const dataToSave = {
        ...formData,
        sale_number: saleNumber,
        sale_date: format(saleDate, 'yyyy-MM-dd'),
        status: initialStatus
      };

      // Criar venda
      const newSale = await base44.entities.Sale.create(dataToSave);
      await logCreation('Venda', `${saleNumber} - ${formData.client_name}`, newSale.id);

      // Criar parcelas para pagamento Pix Parcelado e Cartão
      for (const payment of formData.payment_details) {
        if ((payment.method === 'pix_parcelado' || payment.method === 'cartao_credito') && payment.installments > 1) {
          const installmentAmount = payment.amount / payment.installments;
          let baseDueDate;
          
          if (payment.method === 'pix_parcelado' && firstDueDate) {
            baseDueDate = new Date(firstDueDate);
          } else if (payment.method === 'cartao_credito') {
            // Cartão de crédito: primeira parcela vence D+30
            baseDueDate = new Date(saleDate);
            baseDueDate.setDate(baseDueDate.getDate() + 30);
          } else {
            baseDueDate = new Date(saleDate);
          }
          
          for (let i = 1; i <= payment.installments; i++) {
            const dueDate = new Date(baseDueDate);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
            
            await base44.entities.Installment.create({
              sale_id: newSale.id,
              sale_number: saleNumber,
              client_id: formData.client_id,
              client_name: formData.client_name,
              payment_method: payment.method,
              installment_number: i,
              due_date: dueDate.toISOString().split('T')[0],
              original_amount: installmentAmount,
              paid_amount: 0,
              remaining_amount: installmentAmount,
              payment_status: 'pendente',
              payment_history: []
            });
          }
        }
      }

      // Atualizar estoque
      for (const item of formData.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          if (product.stock_type === 'serializado') {
            // Produto serializado: marcar como vendido
            await base44.entities.Product.update(product.id, {
              status: 'vendido'
            });
          } else if (product.stock_type === 'nao_serializado') {
            // Produto não serializado: deduzir quantidade
            await base44.entities.Product.update(product.id, {
              quantity: product.quantity - item.quantity
            });
          }

          await base44.entities.StockMovement.create({
            product_id: product.id,
            product_name: product.name,
            type: 'saida',
            quantity: item.quantity,
            reason: `Venda ${saleNumber}`,
            reference_id: newSale.id
          });
        }
      }

      // Atualizar status do cliente
      const client = clients.find(c => c.id === formData.client_id);
      if (client && client.status !== 'cliente_ativo') {
        await base44.entities.Client.update(client.id, { status: 'cliente_ativo' });
      }

      toast.success('Venda registrada com sucesso!');
      onOpenChange(false);
      if (onSuccess) await onSuccess();
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
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800">
            Nova Venda
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 pt-2 sm:pt-4">
          {/* SEÇÃO: INFORMAÇÕES BÁSICAS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Data da Venda *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal text-sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{format(saleDate, "dd/MM/yyyy", { locale: ptBR })}</span>
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
              <Label className="text-sm">Cliente <span className="text-red-500">*</span></Label>
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
                  className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
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
            <div className="space-y-2">
              <Label className="text-sm">Categoria <span className="text-red-500">*</span></Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => {
                  const cat = categories.find(c => c.id === value);
                  setFormData({ ...formData, category_id: value, category_name: cat?.name });
                }}
              >
                <SelectTrigger className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>

          {/* SEÇÃO: PRODUTOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">Produtos <span className="text-red-500">*</span></h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Adicionar Produto</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-3 sm:p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                   <div className="flex-1 space-y-2">
                     <div>
                       <Label className="text-xs">Buscar por Número de Série</Label>
                       <Input
                         placeholder="Digite o número de série..."
                         value={item.serial_number || ''}
                         onChange={(e) => {
                           const searchValue = e.target.value;
                           const newItems = [...formData.items];
                           newItems[index].serial_number = searchValue;
                           setFormData({ ...formData, items: newItems });

                           const searchTerm = searchValue.toLowerCase();
                           const foundProduct = products.find(p => 
                             p.serial_number?.toLowerCase() === searchTerm && 
                             p.stock_type === 'serializado' &&
                             p.status === 'disponivel'
                           );
                           if (foundProduct) {
                             updateItem(index, 'product_id', foundProduct.id);
                           }
                         }}
                         list={`serial-list-${index}`}
                         className="text-sm"
                       />
                       <datalist id={`serial-list-${index}`}>
                         {products.filter(p => p.stock_type === 'serializado' && p.status === 'disponivel').map((product) => (
                           <option key={product.id} value={product.serial_number}>
                             {product.name} ({product.brand} {product.model})
                           </option>
                         ))}
                       </datalist>
                     </div>
                     <div>
                       <Label className="text-xs">Ou Buscar por Nome (Produtos não serializados)</Label>
                       <Input
                         placeholder="Digite o nome do produto..."
                         value={item.stock_type === 'nao_serializado' ? item.product_name : ''}
                         onChange={(e) => {
                           const searchValue = e.target.value;
                           const newItems = [...formData.items];
                           
                           // Se limpar o campo, resetar seleção
                           if (searchValue === '') {
                             newItems[index] = { 
                               product_id: '', 
                               product_name: '', 
                               brand: '', 
                               model: '', 
                               serial_number: '', 
                               quantity: 1, 
                               unit_price: 0, 
                               total: 0, 
                               stock_type: '' 
                             };
                           } else {
                             newItems[index].product_name = searchValue;
                           }
                           
                           setFormData({ ...formData, items: newItems });

                           // Busca reativa: filtrar produtos conforme digita
                           if (searchValue.length > 0) {
                             const searchTerm = searchValue.toLowerCase();
                             const foundProduct = products.find(p => 
                               p.name?.toLowerCase().includes(searchTerm) && 
                               p.stock_type === 'nao_serializado' &&
                               p.quantity > 0
                             );
                             if (foundProduct && foundProduct.name?.toLowerCase() === searchTerm) {
                               updateItem(index, 'product_id', foundProduct.id);
                             }
                           }
                         }}
                         list={`name-list-${index}`}
                         className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                       />
                       <datalist id={`name-list-${index}`}>
                         {products
                           .filter(p => {
                             if (p.stock_type !== 'nao_serializado' || p.quantity <= 0) return false;
                             if (!item.product_name) return true;
                             return p.name?.toLowerCase().includes(item.product_name.toLowerCase());
                           })
                           .map((product) => (
                             <option key={product.id} value={product.name}>
                               {product.name} - Estoque: {product.quantity}
                             </option>
                           ))}
                       </datalist>
                     </div>
                   </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 mt-5 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {item.product_id && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm bg-slate-50 p-2 sm:p-3 rounded-lg">
                        <div>
                          <span className="text-slate-500 text-xs">Produto:</span>
                          <p className="font-medium truncate">{item.product_name}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Marca/Modelo:</span>
                          <p className="font-medium truncate">{item.brand} {item.model}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Valor Unit.:</span>
                          <p className="font-bold text-[#1e3a5f]">{formatCurrency(item.unit_price)}</p>
                        </div>
                      </div>
                      {item.stock_type === 'nao_serializado' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Quantidade <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max={products.find(p => p.id === item.product_id)?.quantity || 1}
                              value={item.quantity}
                              onFocus={(e) => {
                                if (e.target.value === '0' || e.target.value === '1') {
                                  e.target.select();
                                }
                              }}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <Input
                              value={formatCurrency(item.total)}
                              disabled
                              className="text-sm font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* SEÇÃO: VALORES E TOTAIS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Valores</h3>
            <Card className="p-3 sm:p-4 bg-slate-50">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div>
                <Label className="text-xs text-slate-500">Subtotal</Label>
                <p className="text-sm sm:text-lg font-semibold truncate">{formatCurrency(formData.subtotal)}</p>
              </div>
              <div>
                <Label className="text-xs">Desconto (%)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onFocus={(e) => {
                    if (e.target.value === '0') {
                      e.target.select();
                    }
                  }}
                  onChange={(e) => updateDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Total</Label>
                <p className="text-base sm:text-xl font-bold text-[#1e3a5f] truncate">{formatCurrency(formData.total)}</p>
              </div>
            </div>
          </Card>
          </div>

          {/* SEÇÃO: PAGAMENTO */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">Formas de Pagamento <span className="text-red-500">*</span></h3>
              <Button type="button" variant="outline" size="sm" onClick={addPayment} className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Adicionar Pagamento</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </div>

            {formData.payment_details.map((payment, index) => (
              <Card key={index} className="p-3 sm:p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-xs">Método</Label>
                        <Select
                          value={payment.method}
                          onValueChange={(value) => updatePayment(index, 'method', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(paymentMethods).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Valor <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={payment.amount}
                            onFocus={(e) => {
                              if (e.target.value === '0') {
                                e.target.select();
                              }
                            }}
                            onChange={(e) => updatePayment(index, 'amount', Number(e.target.value))}
                            placeholder="0.00"
                            className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                          />
                        </div>
                        {(payment.method === 'pix_parcelado' || payment.method === 'cartao_credito') && (
                          <div>
                            <Label className="text-xs">Parcelas</Label>
                            <Select
                              value={String(payment.installments)}
                              onValueChange={(value) => updatePayment(index, 'installments', Number(value))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {payment.method === 'pix_parcelado' && payment.installments > 1 && (
                        <div>
                          <Label className="text-xs">Data do 1º Vencimento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal text-sm"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {firstDueDate ? format(firstDueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={firstDueDate}
                                onSelect={(date) => setFirstDueDate(date)}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(index)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {formData.payment_details.length > 0 && (
              <div className="text-xs sm:text-sm text-slate-600 bg-blue-50 p-2 sm:p-3 rounded">
                <span className="font-medium">Total pago:</span> {formatCurrency(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))} 
                {Math.abs(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.total) > 0.02 && (
                  <span className="text-red-600 ml-2 font-medium block sm:inline mt-1 sm:mt-0">
                    (diferença: {formatCurrency(formData.total - formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO: OBSERVAÇÕES */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Observações</h3>
            <div className="space-y-2">
              <Label className="text-sm">
                Observações
              {Math.abs(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.total) > 0.02 && (
                <span className="text-red-600 ml-1">*</span>
              )}
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={
                Math.abs(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.total) > 0.02
                  ? "Justifique a diferença entre o total e os pagamentos..."
                  : "Observações da venda"
              }
              rows={2}
              className={`text-sm ${
                Math.abs(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.total) > 0.02 && !formData.notes?.trim()
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {Math.abs(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - formData.total) > 0.02 && !formData.notes?.trim() && (
              <p className="text-xs text-red-600">Justificativa obrigatória quando há diferença no valor</p>
            )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-6 sm:pt-8 border-t sticky bottom-0 bg-white pb-2 -mb-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a] w-full sm:w-auto"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalizar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}