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
import { createInstallmentsForSale, syncInstallmentsForSale } from '@/components/sales/syncInstallments';

export default function NewSaleForm({ open, onOpenChange, sale, quote, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
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
      if (!sale) {
        setFirstDueDate(null);
        setSaleDate(new Date());
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && sale) {
      // Preencher form com dados da venda para edição
      setSaleDate(sale.sale_date ? new Date(sale.sale_date + 'T12:00:00') : new Date());
      setFormData({
        client_id: sale.client_id || '',
        client_name: sale.client_name || '',
        client_cpf: sale.client_cpf || '',
        client_phone: sale.client_phone || '',
        client_email: sale.client_email || '',
        client_address: sale.client_address || '',
        test_referral_id: sale.test_referral_id || '',
        test_referral_name: sale.test_referral_name || '',
        items: sale.items || [],
        subtotal: sale.subtotal || 0,
        discount: sale.discount || 0,
        total: sale.total || 0,
        payment_details: sale.payment_details || [],
        seller_id: sale.seller_id || '',
        seller_name: sale.seller_name || '',
        status: sale.status || 'pendente',
        notes: sale.notes || '',
        quote_id: sale.quote_id || '',
        nota_fiscal: sale.nota_fiscal || '',
        category_id: sale.category_id || '',
        category_name: sale.category_name || '',
        sale_number: sale.sale_number || ''
      });
      const originalSubtotal = sale.subtotal || 0;
      const originalDiscount = sale.discount || 0;
      if (originalSubtotal > 0) {
        setDiscountPercent(((originalDiscount / originalSubtotal) * 100));
      }
    }
  }, [open, sale]);

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
        nota_fiscal: '',
        category_id: '',
        category_name: ''
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
        nota_fiscal: '',
        category_id: '',
        category_name: ''
      });
      setDiscountPercent(0);
    }
  };

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

    // Categorias e formas de pagamento podem ser restritas por RLS — carregar separadamente
    try {
      const categoriesData = await base44.entities.ExpenseCategory.filter({ type: 'receita' });
      setCategories(categoriesData);
    } catch (e) {
      console.warn('Categorias não disponíveis para este perfil');
    }

    try {
      const paymentTypesData = await base44.entities.PaymentType.filter({ status: 'ativo' });
      setPaymentTypes(paymentTypesData);
    } catch (e) {
      console.warn('Tipos de pagamento não disponíveis para este perfil');
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
          test_referral_name: latestAppointment?.test_referral_name || '',
          seller_id: currentUser?.id || '',
          seller_name: currentUser?.full_name || ''
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
          test_referral_name: '',
          seller_id: currentUser?.id || '',
          seller_name: currentUser?.full_name || ''
        });
      }
    }
  };

  const addSerializedItem = () => {
    setFormData({
      ...formData,
      items: [{ product_id: '', product_name: '', brand: '', model: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, stock_type: 'serializado' }, ...formData.items]
    });
  };

  const addNonSerializedItem = () => {
    setFormData({
      ...formData,
      items: [{ product_id: '', product_name: '', brand: '', model: '', serial_number: '', quantity: 1, unit_price: 0, total: 0, stock_type: 'nao_serializado' }, ...formData.items]
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
        newItems[index].product_category = product.category || '';
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

  // Aggregate all card_brands from all active records of a given type
  const getAggregatedBrands = (method) => {
    const records = paymentTypes.filter(pt => pt.type === method);
    const allBrands = [];
    const seen = new Set();
    for (const pt of records) {
      for (const b of (pt.card_brands || [])) {
        if (b.brand && !seen.has(b.brand)) {
          seen.add(b.brand);
          allBrands.push(b);
        }
      }
    }
    return allBrands;
  };

  // Find a brand's config across all records of that type
  const findBrandConfig = (method, brand) => {
    for (const pt of paymentTypes.filter(p => p.type === method)) {
      const found = (pt.card_brands || []).find(b => b.brand === brand);
      if (found) return found;
    }
    return null;
  };

  // Get installment rate for credit card brand+installments
  const getCreditRate = (method, brand, installments) => {
    if (!brand) return 0;
    const brandData = findBrandConfig(method, brand);
    if (!brandData) return 0;
    const ir = (brandData.installment_rates || []).find(r => Number(r.installments) === Number(installments));
    return ir ? Number(ir.rate) : 0;
  };

  // Get debit rate for a brand
  const getDebitRate = (brand) => {
    if (!brand) return 0;
    const brandData = findBrandConfig('cartao_debito', brand);
    return brandData ? Number(brandData.rate) : 0;
  };

  // Calculate fee fields for all payment_details and return enriched array + totals
  const calcPaymentFees = (payments) => {
    const enriched = payments.map(p => {
      let feeRate = 0;
      if (p.method === 'cartao_debito' && p.card_brand) {
        feeRate = getDebitRate(p.card_brand);
      } else if (p.method === 'cartao_credito' && p.card_brand) {
        feeRate = getCreditRate('cartao_credito', p.card_brand, p.installments || 1);
      }
      const amount = Number(p.amount) || 0;
      const feeAmount = Number(((amount * feeRate) / 100).toFixed(2));
      const netAmount = Number((amount - feeAmount).toFixed(2));
      return { ...p, fee_rate: feeRate, fee_amount: feeAmount, net_amount: netAmount };
    });
    const totalFeeAmount = Number(enriched.reduce((s, p) => s + p.fee_amount, 0).toFixed(2));
    return { enriched, totalFeeAmount };
  };

  const addPayment = () => {
    setFormData({
      ...formData,
      payment_details: [{ method: 'pix', amount: 0, installments: 1, status: 'pendente', card_brand: '', fee_rate: 0, fee_amount: 0, net_amount: 0 }, ...formData.payment_details]
    });
  };

  const removePayment = (index) => {
    const newPayments = formData.payment_details.filter((_, i) => i !== index);
    setFormData({ ...formData, payment_details: newPayments });
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...formData.payment_details];
    const updated = { ...newPayments[index], [field]: value };

    // Auto-reset brand/fee when method changes
    if (field === 'method') {
      updated.card_brand = '';
      updated.fee_rate = 0;
      updated.installments = 1;
    }
    // Auto-calc fee for debit when brand changes
    if (field === 'card_brand' && updated.method === 'cartao_debito') {
      updated.fee_rate = getDebitRate(value);
    }
    // Auto-calc fee for credit when brand or installments change
    if ((field === 'card_brand' || field === 'installments') && updated.method === 'cartao_credito') {
      updated.fee_rate = getCreditRate('cartao_credito', updated.card_brand, updated.installments);
    }

    newPayments[index] = updated;
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

      // Calculate fees for all payments before saving
      const { enriched: enrichedPayments, totalFeeAmount } = calcPaymentFees(formData.payment_details);
      const totalNetAmount = Math.round((formData.total - totalFeeAmount) * 100) / 100;

      if (sale) {
        // MODO EDIÇÃO: recalcular status baseado nos pagamentos
        const hasPendingMethodEdit = enrichedPayments.some(pd => 
          pd.method === 'pix_parcelado' || pd.method === 'cartao_credito'
        );
        const newStatus = hasPendingMethodEdit ? 'pendente' : 'pago';
        const dataToUpdate = {
          ...formData,
          payment_details: enrichedPayments,
          total_fee_amount: totalFeeAmount,
          total_net_amount: totalNetAmount,
          sale_number: saleNumber,
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          status: newStatus,
        };
        await base44.entities.Sale.update(sale.id, dataToUpdate);
        // Sync installments (Contas a Receber) to reflect new payment_details
        await syncInstallmentsForSale({ ...dataToUpdate, id: sale.id }, saleDate);
        await logEdit('Venda', `${saleNumber} - ${formData.client_name}`, sale.id);
        toast.success('Venda atualizada com sucesso!');
        onOpenChange(false);
        if (onSuccess) await onSuccess();
        return;
      }

      // Definir status inicial baseado no método de pagamento
      const hasPendingMethod = enrichedPayments.some(pd => 
        pd.method === 'pix_parcelado' || pd.method === 'cartao_credito'
      );
      const initialStatus = hasPendingMethod ? 'pendente' : 'pago';

      const dataToSave = {
        ...formData,
        payment_details: enrichedPayments,
        total_fee_amount: totalFeeAmount,
        total_net_amount: totalNetAmount,
        sale_number: saleNumber,
        sale_date: format(saleDate, 'yyyy-MM-dd'),
        status: initialStatus,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || ''
      };

      // Criar venda
      const newSale = await base44.entities.Sale.create(dataToSave);
      await logCreation('Venda', `${saleNumber} - ${formData.client_name}`, newSale.id);

      // Criar parcelas em Contas a Receber para Pix Parcelado e Cartão de Crédito
      await createInstallmentsForSale(newSale, saleDate, firstDueDate);

      // Atualizar estoque via função backend (contorna RLS de Product.update)
      try {
        await base44.functions.invoke('processSaleStock', {
          items: formData.items,
          sale_id: newSale.id,
          sale_number: saleNumber,
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          mode: 'sale'
        });
      } catch (stockError) {
        console.warn('Aviso: não foi possível atualizar estoque automaticamente:', stockError.message);
      }

      // Atualizar status do cliente para "cliente_ativo" após venda
      if (formData.client_id) {
        try {
          await base44.entities.Client.update(formData.client_id, { status: 'cliente_ativo' });
        } catch (e) {
          console.warn('Aviso: não foi possível atualizar status do cliente:', e.message);
        }
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

  // Build payment methods list from active payment types ONLY
  const paymentMethodLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX à Vista',
    pix_parcelado: 'PIX Parcelado',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
  };
  const paymentMethods = Object.fromEntries(
    paymentTypes.map(pt => [pt.type, paymentMethodLabels[pt.type] || pt.type])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800">
            {sale ? 'Editar Venda' : 'Nova Venda'}
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
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>Nenhuma categoria disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>

          {/* SEÇÃO: PRODUTOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">Produtos <span className="text-red-500">*</span></h3>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addSerializedItem} className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Produto A
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addNonSerializedItem} className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Produto B
                </Button>
              </div>
            </div>

            {formData.items.map((item, index) => (
              <Card key={index} className="p-3 sm:p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                   <div className="flex-1 space-y-2">
                     {item.stock_type === 'serializado' ? (
                       <div>
                         <Label className="text-xs">Produto A (Buscar por Número de Série)</Label>
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
                           className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                         />
                         <datalist id={`serial-list-${index}`}>
                           {products.filter(p => p.stock_type === 'serializado' && p.status === 'disponivel').map((product) => (
                             <option key={product.id} value={product.serial_number}>
                               {product.name} ({product.brand} {product.model})
                             </option>
                           ))}
                         </datalist>
                       </div>
                     ) : (
                       <div>
                         <Label className="text-xs">Produto B (Buscar por Nome)</Label>
                         <Input
                           placeholder="Digite o nome do produto..."
                           value={item.product_name || ''}
                           onChange={(e) => {
                             const searchValue = e.target.value;
                             const newItems = [...formData.items];
                             
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
                                 stock_type: 'nao_serializado' 
                               };
                             } else {
                               newItems[index].product_name = searchValue;
                             }
                             
                             setFormData({ ...formData, items: newItems });

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
                     )}
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
                  step="0.0000001"
                  min="0"
                  max="100"
                  value={discountPercent === 0 ? '' : discountPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
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

                      {/* Brand selector for debit/credit */}
                      {(payment.method === 'cartao_debito' || payment.method === 'cartao_credito') && (() => {
                        const brands = getAggregatedBrands(payment.method);
                        // Include current saved brand even if not in list yet (avoids blank on load)
                        const allOptions = payment.card_brand && !brands.find(b => b.brand === payment.card_brand)
                          ? [{ brand: payment.card_brand }, ...brands]
                          : brands;
                        return (
                          <div>
                            <Label className="text-xs">Bandeira</Label>
                            <Select
                              value={payment.card_brand || ''}
                              onValueChange={(value) => updatePayment(index, 'card_brand', value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecione a bandeira..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allOptions.map(b => (
                                  <SelectItem key={b.brand} value={b.brand}>{b.brand}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Valor <span className="text-red-500">*</span></Label>
                          <Input
                           type="number"
                           inputMode="decimal"
                           step="0.01"
                           value={payment.amount === 0 ? '' : payment.amount}
                           onFocus={(e) => e.target.select()}
                           onChange={(e) => updatePayment(index, 'amount', e.target.value === '' ? 0 : Number(e.target.value))}
                           placeholder="0.00"
                           className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                          />
                        </div>
                        {(payment.method === 'pix_parcelado' || payment.method === 'cartao_credito') && (
                          <div>
                            <Label className="text-xs">Parcelas</Label>
                            <Select
                              value={String(payment.installments || 1)}
                              onValueChange={(value) => updatePayment(index, 'installments', Number(value))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const brand = findBrandConfig(payment.method, payment.card_brand);
                                  const available = payment.method === 'cartao_credito' && brand
                                    ? (brand.installment_rates || []).map(ir => Number(ir.installments)).sort((a,b)=>a-b)
                                    : [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
                                  return available.map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Fee info for debit - taxa é descontada do valor recebido */}
                      {payment.method === 'cartao_debito' && payment.card_brand && payment.fee_rate > 0 && (
                        <p className="text-xs text-slate-500 bg-amber-50 px-2 py-1 rounded">
                          Taxa {payment.card_brand}: {payment.fee_rate}% → você recebe: {formatCurrency(payment.amount * (1 - payment.fee_rate / 100))}
                        </p>
                      )}
                      {/* Fee info for credit - taxa é descontada de cada parcela recebida */}
                      {payment.method === 'cartao_credito' && payment.card_brand && (payment.installments || 1) > 0 && payment.fee_rate > 0 && (
                        <p className="text-xs text-slate-500 bg-amber-50 px-2 py-1 rounded">
                          Taxa {payment.installments || 1}x {payment.card_brand}: {payment.fee_rate}% → parcela líquida: {formatCurrency((payment.amount / (payment.installments || 1)) * (1 - payment.fee_rate / 100))}
                        </p>
                      )}

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
              {sale ? 'Salvar Alterações' : 'Finalizar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}