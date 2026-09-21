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
import { Loader2, Plus, Trash2, Calendar as CalendarIcon, Wrench, PlusCircle, Link2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logCreation, logEdit } from '@/components/utils/auditLogger';
import { createInstallmentsForSale, syncInstallmentsForSale, createPendingBalanceInstallment } from '@/components/sales/syncInstallments';
import { recalculateClientStatus } from '@/components/utils/clientStatusSync';

export default function NewSaleForm({ open, onOpenChange, sale, quote, onSuccess, preselectedClient, complementaryTarget }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [referenceProducts, setReferenceProducts] = useState([]);
  const [billingCfg, setBillingCfg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountInput, setDiscountInput] = useState('');
  const [saleDate, setSaleDate] = useState(new Date());
  const [firstDueDate, setFirstDueDate] = useState(null);
  const [isComplementaryMode, setIsComplementaryMode] = useState(false);
  const [complementaryOptions, setComplementaryOptions] = useState([]);
  const [complementaryToSale, setComplementaryToSale] = useState(null);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [pendingBalanceInput, setPendingBalanceInput] = useState('');
  const [pendingDueDate, setPendingDueDate] = useState(null);
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
        setDiscountInput('');
        setDiscountPercent(0);
        setPendingBalance(0);
        setPendingBalanceInput('');
        setPendingDueDate(null);
        // Pré-preencher modo complementar se vier de uma venda original
        if (complementaryTarget) {
          setIsComplementaryMode(true);
          setComplementaryToSale(complementaryTarget);
          setFormData(prev => ({
            ...prev,
            client_id: complementaryTarget.client_id,
            client_name: complementaryTarget.client_name,
            client_cpf: complementaryTarget.client_cpf || '',
            client_phone: complementaryTarget.client_phone || '',
            client_email: complementaryTarget.client_email || '',
            client_address: complementaryTarget.client_address || '',
            is_complementary: true,
            complementary_to_sale_id: complementaryTarget.id,
            complementary_to_sale_number: complementaryTarget.sale_number,
            seller_id: currentUser?.id || '',
            seller_name: currentUser?.full_name || '',
            items: [],
            payment_details: [{ method: 'pix', amount: complementaryTarget.pending_balance || 0, installments: 1, status: 'pendente', card_brand: '', fee_rate: 0, fee_amount: 0, net_amount: 0 }]
          }));
        } else {
          setIsComplementaryMode(false);
          setComplementaryToSale(null);
        }
      }
    }
  }, [open, complementaryTarget]);

  useEffect(() => {
    if (open && sale) {
      // Preencher form com dados da venda para edição
      setSaleDate(sale.sale_date ? new Date(sale.sale_date + 'T12:00:00') : new Date());
      // Restaurar data do 1º vencimento do PIX parcelado
      const pixPayment = sale.payment_details?.find(p => p.method === 'pix_parcelado' && p.first_due_date);
      if (pixPayment?.first_due_date) {
        setFirstDueDate(new Date(pixPayment.first_due_date + 'T12:00:00'));
      }
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
      // Restaurar saldo a completar (venda parcial)
      setPendingBalance(sale.pending_balance || 0);
      setPendingBalanceInput(sale.pending_balance ? String(sale.pending_balance).replace('.', ',') : '');
      setPendingDueDate(sale.pending_due_date ? new Date(sale.pending_due_date + 'T12:00:00') : null);
      const originalSubtotal = sale.subtotal || 0;
      const originalDiscount = sale.discount || 0;
      if (originalSubtotal > 0) {
        const pct = (originalDiscount / originalSubtotal) * 100;
        setDiscountPercent(pct);
        setDiscountInput(String(pct).replace('.', ','));
      } else {
        setDiscountInput('');
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
      setDiscountInput('');
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
      setDiscountInput('');
    }
  };

  const loadData = async () => {
    try {
      const [clientsData, productsData, servicesData, user, refProds, allSettings] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Product.list(),
        base44.entities.Service.filter({ is_active: true }),
        base44.auth.me(),
        base44.entities.ReferenceProduct.list(),
        base44.entities.AppSettings.list()
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setServices(servicesData);
      setCurrentUser(user);
      setReferenceProducts(refProds);
      const billingRec = allSettings.find(r => r.setting_key === 'billing_config');
      if (billingRec?.setting_value) setBillingCfg(billingRec.setting_value);

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

    // Carregar vendas com saldo pendente (para Pagamento Complementar)
    try {
      const allSales = await base44.entities.Sale.list('-sale_date', 500);
      setComplementaryOptions(allSales.filter(s =>
        s.pending_balance > 0 && s.status !== 'cancelado' && !s.is_complementary
      ));
    } catch (e) {
      console.warn('Não foi possível carregar vendas parciais');
    }
  };

  // Alternar modo Pagamento Complementar
  const toggleComplementaryMode = () => {
    const next = !isComplementaryMode;
    setIsComplementaryMode(next);
    if (next) {
      // Entrando no modo complementar: limpa itens e desconto
      setFormData(prev => ({
        ...prev,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        category_id: '',
        category_name: '',
        quote_id: ''
      }));
      setDiscountPercent(0);
      setDiscountInput('');
      setPendingBalance(0);
      setPendingBalanceInput('');
      setPendingDueDate(null);
    } else {
      // Saindo do modo complementar: limpa vínculo
      setComplementaryToSale(null);
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_cpf: '',
        client_phone: '',
        client_email: '',
        client_address: '',
        is_complementary: false,
        complementary_to_sale_id: '',
        complementary_to_sale_number: ''
      }));
    }
  };

  // Selecionar venda original no modo complementar (auto-preenche cliente)
  const handleSelectOriginalSale = (saleId) => {
    const original = complementaryOptions.find(s => s.id === saleId);
    setComplementaryToSale(original || null);
    if (original) {
      setFormData(prev => ({
        ...prev,
        client_id: original.client_id,
        client_name: original.client_name,
        client_cpf: original.client_cpf || '',
        client_phone: original.client_phone || '',
        client_email: original.client_email || '',
        client_address: original.client_address || '',
        is_complementary: true,
        complementary_to_sale_id: original.id,
        complementary_to_sale_number: original.sale_number,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        is_complementary: false,
        complementary_to_sale_id: '',
        complementary_to_sale_number: ''
      }));
    }
  };

  // Atualizar saldo a completar posterior
  const updatePendingBalance = (rawValue) => {
    setPendingBalanceInput(rawValue);
    const parsed = parseDecimal(rawValue);
    setPendingBalance(parsed);
  };

  // Recalcular total no modo complementar (total = soma dos pagamentos)
  const recalcComplementaryTotal = (payments) => {
    const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    setFormData(prev => ({ ...prev, subtotal: total, discount: 0, total }));
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

  const addServiceItem = () => {
    setFormData({
      ...formData,
      items: [{ product_id: '', product_name: '', product_category: 'servico', service_id: '', quantity: 1, unit_price: 0, total: 0, stock_type: 'servico' }, ...formData.items]
    });
  };

  const updateServiceItem = (index, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    const newItems = [...formData.items];
    if (service) {
      newItems[index] = {
        ...newItems[index],
        service_id: service.id,
        product_id: '',
        product_name: service.name,
        product_category: 'servico',
        unit_price: service.price,
        quantity: 1,
        total: service.price,
        stock_type: 'servico'
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        service_id: '',
        product_id: '',
        product_name: '',
        unit_price: 0,
        total: 0
      };
    }
    recalculateTotals(newItems, formData.payment_details);
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
    const newPayments = [{ method: 'pix', amount: 0, installments: 1, status: 'pendente', card_brand: '', fee_rate: 0, fee_amount: 0, net_amount: 0 }, ...formData.payment_details];
    setFormData({ ...formData, payment_details: newPayments });
    if (isComplementaryMode) recalcComplementaryTotal(newPayments);
  };

  const removePayment = (index) => {
    const newPayments = formData.payment_details.filter((_, i) => i !== index);
    setFormData({ ...formData, payment_details: newPayments });
    if (isComplementaryMode) recalcComplementaryTotal(newPayments);
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...formData.payment_details];
    const updated = { ...newPayments[index], [field]: value };

    // Auto-reset brand/fee when method changes
    if (field === 'method') {
      updated.card_brand = '';
      updated.fee_rate = 0;
      updated.installments = 1;
      updated.voucher_code = '';
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
    if (isComplementaryMode) recalcComplementaryTotal(newPayments);
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

  // Parser que aceita vírgula ou ponto como separador decimal (compatível com teclado mobile BR)
  const parseDecimal = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const normalized = String(value).replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return isNaN(num) ? 0 : num;
  };

  const updateDiscount = (rawValue) => {
    setDiscountInput(rawValue);
    const parsedPercent = parseDecimal(rawValue);
    setDiscountPercent(parsedPercent);
    const discountValue = (formData.subtotal * parsedPercent) / 100;
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

    // --- Validações por modo ---
    if (isComplementaryMode) {
      if (!formData.complementary_to_sale_id) {
        toast.error('Selecione a venda original que deseja complementar');
        return;
      }
      if (!formData.client_id || formData.payment_details.length === 0) {
        toast.error('Selecione a venda original e adicione uma forma de pagamento');
        return;
      }
      const compPayments = formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      if (compPayments <= 0) {
        toast.error('Informe o valor do pagamento complementar');
        return;
      }
    } else {
      if (!formData.client_id || formData.items.length === 0 || formData.payment_details.length === 0) {
        toast.error('Preencha todos os campos obrigatórios e adicione pelo menos uma forma de pagamento');
        return;
      }

      // Validar soma: pagamentos + saldo a completar deve bater com o total
      const totalPayments = formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalCovered = totalPayments + pendingBalance;
      const hasDifference = Math.abs(totalCovered - formData.total) > 0.02;

      // Se houver diferença (sem ser coberta pelo saldo a completar), exigir justificativa
      if (hasDifference && !formData.notes?.trim()) {
        toast.error('O valor dos pagamentos + saldo a completar difere do total da venda. Adicione uma justificativa nas observações.');
        return;
      }

      // Validar data de vencimento do saldo a completar
      if (pendingBalance > 0 && !pendingDueDate) {
        toast.error('Informe a data de vencimento do saldo a completar posterior');
        return;
      }

      // Verificar estoque
      for (const item of formData.items) {
        if (item.stock_type === 'servico') continue;
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
    }

    setLoading(true);
    try {
      const saleNumber = formData.sale_number || generateSaleNumber();
      const { enriched: enrichedPayments, totalFeeAmount } = calcPaymentFees(formData.payment_details);
      const totalNetAmount = Math.round((formData.total - totalFeeAmount) * 100) / 100;
      const saleDateStr = format(saleDate, 'yyyy-MM-dd');
      const pendingDueDateStr = pendingDueDate ? format(pendingDueDate, 'yyyy-MM-dd') : null;

      // ===================== MODO EDIÇÃO =====================
      if (sale) {
        const hasPendingMethodEdit = enrichedPayments.some(pd =>
          pd.method === 'pix_parcelado' || pd.method === 'cartao_credito'
        );
        let newStatus = hasPendingMethodEdit ? 'pendente' : 'pago';
        if (pendingBalance > 0) newStatus = 'parcial';

        const dataToUpdate = {
          ...formData,
          payment_details: enrichedPayments,
          total_fee_amount: totalFeeAmount,
          total_net_amount: totalNetAmount,
          sale_number: saleNumber,
          sale_date: saleDateStr,
          status: newStatus,
          pending_balance: pendingBalance,
          pending_due_date: pendingDueDateStr,
        };
        await base44.entities.Sale.update(sale.id, dataToUpdate);
        await syncInstallmentsForSale({ ...dataToUpdate, id: sale.id }, saleDate, firstDueDate);
        await logEdit('Venda', `${saleNumber} - ${formData.client_name}`, sale.id);
        toast.success('Venda atualizada com sucesso!');
        onOpenChange(false);
        if (onSuccess) await onSuccess();
        return;
      }

      // ===================== MODO COMPLEMENTAR (nova venda) =====================
      if (isComplementaryMode) {
        const hasPendingMethod = enrichedPayments.some(pd =>
          pd.method === 'pix_parcelado' || pd.method === 'cartao_credito'
        );
        const compStatus = hasPendingMethod ? 'pendente' : 'pago';

        const compData = {
          client_id: formData.client_id,
          client_name: formData.client_name,
          client_cpf: formData.client_cpf,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          client_address: formData.client_address,
          items: [],
          subtotal: formData.total,
          discount: 0,
          total: formData.total,
          total_fee_amount: totalFeeAmount,
          total_net_amount: totalNetAmount,
          payment_details: enrichedPayments,
          seller_id: currentUser?.id || '',
          seller_name: currentUser?.full_name || '',
          sale_number: saleNumber,
          sale_date: saleDateStr,
          status: compStatus,
          is_complementary: true,
          complementary_to_sale_id: formData.complementary_to_sale_id,
          complementary_to_sale_number: formData.complementary_to_sale_number,
          notes: formData.notes,
          category_id: formData.category_id,
          category_name: formData.category_name
        };

        const newCompSale = await base44.entities.Sale.create(compData);
        await logCreation('Venda', `${saleNumber} - Pagto Complementar - ${formData.client_name}`, newCompSale.id);

        // Parcelas do pagamento complementar (seguem regras normais: pix_parcelado/cartao_credito)
        await createInstallmentsForSale(newCompSale, saleDate, firstDueDate);

        // Atualizar venda original: reduzir saldo pendente
        const original = complementaryToSale;
        if (original) {
          const newPendingBalance = Math.max(0, Math.round(((original.pending_balance || 0) - formData.total) * 100) / 100);
          const updateOriginal = { pending_balance: newPendingBalance };
          if (newPendingBalance <= 0.01) {
            updateOriginal.pending_balance = 0;
            updateOriginal.status = 'pago';
            updateOriginal.pending_due_date = null;
          }
          try {
            await base44.entities.Sale.update(original.id, updateOriginal);
          } catch (e) {
            console.warn('Aviso: não foi possível atualizar saldo da venda original:', e.message);
          }
        }

        // Recalcular status do cliente
        if (formData.client_id) {
          try { await recalculateClientStatus(formData.client_id); } catch (e) { console.warn(e); }
        }

        toast.success('Pagamento complementar registrado com sucesso!');
        onOpenChange(false);
        if (onSuccess) await onSuccess();
        return;
      }

      // ===================== MODO NORMAL (nova venda) =====================
      const hasPendingMethod = enrichedPayments.some(pd =>
        pd.method === 'pix_parcelado' || pd.method === 'cartao_credito'
      );
      let initialStatus = hasPendingMethod ? 'pendente' : 'pago';
      if (pendingBalance > 0) initialStatus = 'parcial';

      const dataToSave = {
        ...formData,
        payment_details: enrichedPayments,
        total_fee_amount: totalFeeAmount,
        total_net_amount: totalNetAmount,
        sale_number: saleNumber,
        sale_date: saleDateStr,
        status: initialStatus,
        pending_balance: pendingBalance,
        pending_due_date: pendingDueDateStr,
        seller_id: currentUser?.id || '',
        seller_name: currentUser?.full_name || ''
      };

      const newSale = await base44.entities.Sale.create(dataToSave);
      await logCreation('Venda', `${saleNumber} - ${formData.client_name}`, newSale.id);

      // Parcelas de cartão/pix parcelado
      await createInstallmentsForSale(newSale, saleDate, firstDueDate);

      // Parcela do saldo a completar posterior (sempre gera 1 lançamento em Contas a Receber)
      if (pendingBalance > 0 && pendingDueDateStr) {
        await createPendingBalanceInstallment(
          { ...newSale, sale_date: saleDateStr },
          pendingBalance,
          pendingDueDateStr
        );
      }

      // Atualizar estoque via função backend
      try {
        await base44.functions.invoke('processSaleStock', {
          items: formData.items,
          sale_id: newSale.id,
          sale_number: saleNumber,
          sale_date: saleDateStr,
          mode: 'sale'
        });
      } catch (stockError) {
        console.warn('Aviso: não foi possível atualizar estoque automaticamente:', stockError.message);
      }

      // Recalcular status do cliente
      if (formData.client_id) {
        try { await recalculateClientStatus(formData.client_id); } catch (e) { console.warn(e); }
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

  const getRefPriceInfo = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product?.reference || !billingCfg) return null;
    const refProd = referenceProducts.find(
      rp => rp.reference.trim().toLowerCase() === product.reference.trim().toLowerCase()
    );
    if (!refProd) return null;
    const inclFixed = refProd.include_fixed_cost !== false;
    const fcost = inclFixed ? (billingCfg.fixed_cost || 0) : 0;
    const tc = (refProd.cost || 0) + fcost;
    const markupPct = billingCfg[`markup_category_${refProd.category}`] || 0;
    const refFinalPrice = tc + tc * (markupPct / 100);

    // Preço calculado do produto no estoque (suggestedSalePrice)
    const prodCost = (product.product_cost || 0) + (product.icms || 0) + (product.ipi || 0) + (product.include_fixed_cost !== false ? (billingCfg.fixed_cost || 0) : 0);
    const prodMarkupPct = billingCfg[`markup_category_${product.markup_category}`] || 0;
    const suggestedSalePrice = prodCost + prodCost * (prodMarkupPct / 100);

    return { refProd, refFinalPrice, suggestedSalePrice };
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
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            {isComplementaryMode && <Link2 className="h-5 w-5 text-[#6B3FA0]" />}
            {sale ? 'Editar Venda' : isComplementaryMode ? 'Pagamento Complementar' : 'Nova Venda'}
          </DialogTitle>
          {isComplementaryMode && (
            <p className="text-sm text-[#6B3FA0] mt-1">
              Vinculado à venda <strong>{complementaryToSale?.sale_number}</strong> · Saldo atual: {formatCurrency(complementaryToSale?.pending_balance || 0)}
            </p>
          )}
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

          {/* SEÇÃO: PRODUTOS / COMPLEMENTAR */}
          <div className="space-y-4">
            {isComplementaryMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold text-[#6B3FA0]">Pagamento Complementar</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={toggleComplementaryMode} className="text-xs text-slate-500">
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Voltar para venda normal
                  </Button>
                </div>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-[#6B3FA0]">Venda Original (com saldo pendente) <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.complementary_to_sale_id || ''}
                        onValueChange={handleSelectOriginalSale}
                      >
                        <SelectTrigger className="text-sm mt-1">
                          <SelectValue placeholder="Selecione a venda que deseja complementar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {complementaryOptions.length === 0 ? (
                            <SelectItem value="__none__" disabled>Nenhuma venda com saldo pendente</SelectItem>
                          ) : (
                            complementaryOptions.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.sale_number} — {s.client_name} (Saldo: {formatCurrency(s.pending_balance)})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {complementaryToSale && (
                      <div className="bg-white rounded-lg p-3 border border-purple-100 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cliente:</span>
                          <span className="font-medium">{complementaryToSale.client_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Valor original:</span>
                          <span className="font-medium">{formatCurrency(complementaryToSale.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Saldo pendente:</span>
                          <span className="font-bold text-amber-600">{formatCurrency(complementaryToSale.pending_balance)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
            {!isComplementaryMode && (
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-700">Produtos {!sale && <span className="text-red-500">*</span>}</h3>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={addSerializedItem} className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Produto A
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addNonSerializedItem} className="text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Produto B
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addServiceItem} className="text-xs sm:text-sm border-[#6B3FA0] text-[#6B3FA0] hover:bg-[#6B3FA0]/10">
                  <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Serviço
                </Button>
                {!sale && (
                  <Button type="button" variant="outline" size="sm" onClick={toggleComplementaryMode} className="text-xs sm:text-sm border-[#6B3FA0] bg-[#6B3FA0]/10 text-[#6B3FA0] hover:bg-[#6B3FA0]/20">
                    <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Pagamento Complementar
                  </Button>
                )}
              </div>
            </div>
            )}

            {formData.items.map((item, index) => (
              <Card key={index} className="p-3 sm:p-4">
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                   <div className="flex-1 space-y-2">
                     {item.stock_type === 'servico' ? (
                        <div>
                          <Label className="text-xs">Serviço (Manutenção / Partes e Peças)</Label>
                          <Select
                            value={item.service_id || ''}
                            onValueChange={(value) => updateServiceItem(index, value)}
                          >
                            <SelectTrigger className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow">
                              <SelectValue placeholder="Selecione um serviço..." />
                            </SelectTrigger>
                            <SelectContent>
                              {services.length > 0 ? (
                                services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} — {formatCurrency(service.price)}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none__" disabled>Nenhum serviço cadastrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : item.stock_type === 'serializado' ? (
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
                                   p.quantity > 0 &&
                                   p.status !== 'indisponivel'
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
                               if (p.stock_type !== 'nao_serializado' || p.quantity <= 0 || p.status === 'indisponivel') return false;
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
                  {(item.product_id || item.service_id) && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm bg-slate-50 p-2 sm:p-3 rounded-lg">
                        <div>
                          <span className="text-slate-500 text-xs">{item.stock_type === 'servico' ? 'Serviço:' : 'Produto:'}</span>
                          <p className="font-medium truncate">{item.product_name}</p>
                        </div>
                        {item.stock_type === 'servico' ? (
                          <div>
                            <span className="text-slate-500 text-xs">Categoria:</span>
                            <p className="font-medium truncate">Serviço</p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-500 text-xs">Marca/Modelo:</span>
                            <p className="font-medium truncate">{item.brand} {item.model}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 text-xs">Valor Unit.:</span>
                          <p className="font-bold text-[#1e3a5f]">{formatCurrency(item.unit_price)}</p>
                        </div>
                      </div>
                      {(() => {
                        const refInfo = getRefPriceInfo(item.product_id);
                        if (!refInfo) return null;
                        return (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-semibold text-amber-800">📖 Produto de Referência: </span>
                              <span className="text-xs text-slate-600">{refInfo.refProd.reference} — {refInfo.refProd.name}</span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Cat. {refInfo.refProd.category}</span>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <p className="text-xs text-slate-500">Valor Final (Referência)</p>
                                <p className="text-sm font-bold text-amber-700">{formatCurrency(refInfo.refFinalPrice)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Preço Calculado (Form)</p>
                                <p className="text-sm font-bold text-purple-700">{formatCurrency(refInfo.suggestedSalePrice)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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
                      {item.stock_type === 'servico' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Valor Unit. (R$)</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={item.unit_price === 0 ? '' : item.unit_price}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(index, 'unit_price', e.target.value === '' ? 0 : Number(e.target.value))}
                              placeholder="0.00"
                              className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
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
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={discountInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateDiscount(e.target.value)}
                    placeholder="0"
                    className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow pr-6"
                  />
                  {discountPercent !== 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
                      {discountPercent > 0 ? '↓' : '↑'}
                    </span>
                  )}
                </div>
                {discountPercent !== 0 && (
                  <p className={`text-xs ${discountPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {discountPercent > 0 ? 'Desconto' : 'Acréscimo'}: {Math.abs(discountPercent).toFixed(2)}%
                  </p>
                )}
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

                      {/* Código do comprovante para cartão */}
                      {(payment.method === 'cartao_credito' || payment.method === 'cartao_debito') && (
                        <div>
                          <Label className="text-xs">Código do Comprovante</Label>
                          <Input
                            placeholder="Digite o código do comprovante..."
                            value={payment.voucher_code || ''}
                            onChange={(e) => updatePayment(index, 'voucher_code', e.target.value)}
                            className="text-sm focus-visible:ring-2 focus-visible:ring-[#6B3FA0] focus-visible:ring-offset-1 transition-shadow"
                          />
                        </div>
                      )}

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
                                  {payment.first_due_date
                                    ? format(new Date(payment.first_due_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                                    : firstDueDate
                                      ? format(firstDueDate, "dd/MM/yyyy", { locale: ptBR })
                                      : "Selecione..."}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={payment.first_due_date ? new Date(payment.first_due_date + 'T12:00:00') : firstDueDate}
                                onSelect={(date) => {
                                  setFirstDueDate(date);
                                  updatePayment(index, 'first_due_date', date ? format(date, 'yyyy-MM-dd') : null);
                                }}
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

            {formData.payment_details.length > 0 && !isComplementaryMode && (
              <div className="text-xs sm:text-sm text-slate-600 bg-blue-50 p-2 sm:p-3 rounded">
                <span className="font-medium">Total pago:</span> {formatCurrency(formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                {pendingBalance > 0 && (
                  <span className="text-amber-700 ml-2 font-medium block sm:inline mt-1 sm:mt-0">
                    + Saldo a completar: {formatCurrency(pendingBalance)}
                  </span>
                )}
                {Math.abs((formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + pendingBalance) - formData.total) > 0.02 && (
                  <span className="text-red-600 ml-2 font-medium block sm:inline mt-1 sm:mt-0">
                    (diferença: {formatCurrency(formData.total - formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - pendingBalance)})
                  </span>
                )}
              </div>
            )}

            {/* Pagamento a completar posterior (venda parcial) */}
            {!isComplementaryMode && (
              <Card className="p-3 sm:p-4 bg-amber-50 border-amber-300">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-semibold text-amber-800">Pagamento a Completar Posterior</h4>
                  </div>
                  <p className="text-xs text-amber-700">Informe o saldo restante e a data prevista para recebimento. Será gerado um lançamento em Contas a Receber.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Valor a Completar (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={pendingBalanceInput}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updatePendingBalance(e.target.value)}
                        placeholder="0,00"
                        className="text-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 transition-shadow"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Data de Vencimento {pendingBalance > 0 && <span className="text-red-500">*</span>}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-sm"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {pendingDueDate
                                ? format(pendingDueDate, "dd/MM/yyyy", { locale: ptBR })
                                : "Selecione..."}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={pendingDueDate}
                            onSelect={(date) => setPendingDueDate(date)}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* SEÇÃO: OBSERVAÇÕES */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Observações</h3>
            <div className="space-y-2">
              <Label className="text-sm">
                Observações
              {Math.abs((formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + pendingBalance) - formData.total) > 0.02 && (
                <span className="text-red-600 ml-1">*</span>
              )}
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={
                Math.abs((formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + pendingBalance) - formData.total) > 0.02
                  ? "Justifique a diferença entre o total e os pagamentos..."
                  : "Observações da venda"
              }
              rows={2}
              className={`text-sm ${
                Math.abs((formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + pendingBalance) - formData.total) > 0.02 && !formData.notes?.trim()
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {Math.abs((formData.payment_details.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) + pendingBalance) - formData.total) > 0.02 && !formData.notes?.trim() && (
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
              {sale ? 'Salvar Alterações' : isComplementaryMode ? 'Registrar Pagamento Complementar' : 'Finalizar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}