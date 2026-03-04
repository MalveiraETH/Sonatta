import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import NewSaleForm from '@/components/sales/NewSaleForm';
import ContractGenerator from '@/components/contracts/ContractGenerator';
import InvoiceDialog from '@/components/sales/InvoiceDialog';
import SaleDetailsDialog from '@/components/sales/SaleDetailsDialog';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { usePullToRefresh } from '@/components/utils/usePullToRefresh';
import { Search, Filter, MoreVertical, Eye, MessageCircle, FileSignature, X, Plus, ShoppingCart, TrendingUp, DollarSign, XCircle, FileText, Info, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import { logDeletion } from '@/components/utils/auditLogger';

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);

  const loadData = async () => {
    try {
      const [salesData, user] = await Promise.all([
        base44.entities.Sale.list('-sale_date'),
        base44.auth.me()
      ]);
      setSales(salesData);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      await loadData();
      const now = new Date();
      toast.success(`Atualizado às ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (error) {
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  };

  const { isRefreshing, pullDistance } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, statusFilter]);

  const filterSales = () => {
    let filtered = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.client_name?.toLowerCase().includes(term) ||
        s.sale_number?.toLowerCase().includes(term) ||
        s.seller_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getTotalPayments = (sale) => {
    return sale.payment_details?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  };

  const getCardFeeTotal = (sale) => {
    return (sale.payment_details || []).reduce((sum, p) => {
      const isCard = p.method === 'cartao_credito' || p.method === 'cartao_debito';
      if (isCard && p.fee_rate > 0) {
        return sum + (p.amount || 0) * (p.fee_rate / 100);
      }
      return sum;
    }, 0);
  };

  const getNetTotal = (sale) => {
    return getTotalPayments(sale) - getCardFeeTotal(sale);
  };

  const sendWhatsApp = async (sale) => {
    if (!sale.client_phone) {
      toast.error('Cliente não possui telefone');
      return;
    }
    const phone = sale.client_phone.replace(/\D/g, '');
    
    let productsList = '';
    sale.items?.forEach((item, idx) => {
      productsList += `${idx + 1}. ${item.product_name}`;
      if (item.serial_number) {
        productsList += ` - S/N: ${item.serial_number}`;
      }
      productsList += `\n   ${formatCurrency(item.unit_price)}`;
      productsList += '\n';
    });

    let paymentsList = '';
    sale.payment_details?.forEach((payment, idx) => {
      const methodLabels = {
        dinheiro: 'Dinheiro',
        pix: 'PIX à Vista',
        pix_parcelado: 'PIX Parcelado',
        cartao_credito: 'Cartão de Crédito',
        cartao_debito: 'Cartão de Débito',
        boleto: 'Boleto',
        transferencia: 'Transferência'
      };
      
      paymentsList += `• ${methodLabels[payment.method] || payment.method}: ${formatCurrency(payment.amount)}`;
      if (payment.installments > 1) {
        paymentsList += ` (${payment.installments}x de ${formatCurrency(payment.amount / payment.installments)})`;
      }
      paymentsList += '\n';
    });

    let template = `🎉 *Parabéns pela sua compra!* 🎉

Olá {{client_name}},

Sua compra foi confirmada com sucesso!

📋 *Detalhes da Venda*
*Venda:* {{sale_number}}
*Data:* {{sale_date}}

🦻 *Aparelhos Adquiridos:*
{{products_list}}

💰 *Valores:*
*Subtotal:* {{subtotal}}
*Desconto:* {{discount}}
*TOTAL:* {{total}}

💳 *Formas de Pagamento:*
{{payments_list}}

Obrigado pela preferência!

*Sonatta Soluções Auditivas*`;

    try {
      const user = await base44.auth.me();
      if (user.whatsapp_sale_template) {
        template = user.whatsapp_sale_template;
      }
    } catch (error) {
      console.log('Usando template padrão');
    }

    const message = template
      .replace(/{{client_name}}/g, sale.client_name)
      .replace(/{{sale_number}}/g, sale.sale_number)
      .replace(/{{sale_date}}/g, formatLocalDate(sale.sale_date || sale.created_date))
      .replace(/{{products_list}}/g, productsList)
      .replace(/{{subtotal}}/g, formatCurrency(sale.subtotal))
      .replace(/{{discount}}/g, formatCurrency(sale.discount || 0))
      .replace(/{{total}}/g, formatCurrency(sale.total))
      .replace(/{{payments_list}}/g, paymentsList);

    const waMeUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    const whatsappAppUrl = `whatsapp://send?phone=55${phone}&text=${encodeURIComponent(message)}`;

    try {
      window.location.href = whatsappAppUrl;
      setTimeout(() => {
        if (!document.hidden) {
          window.open(waMeUrl, '_blank');
        }
      }, 500);
    } catch (e) {
      console.error("Erro ao tentar abrir WhatsApp:", e);
      window.open(waMeUrl, '_blank');
    }
  };

  const openCancelConfirm = (sale) => {
    setSaleToCancel(sale);
    setCancelConfirmOpen(true);
  };

  const handleCancel = async (sale) => {
    try {
      // Devolver produtos ao estoque
      for (const item of sale.items) {
        const product = await base44.entities.Product.list().then(products => 
          products.find(p => p.id === item.product_id)
        );
        
        if (product) {
          if (product.stock_type === 'serializado') {
            // Para produtos serializados, voltar status para disponível
            await base44.entities.Product.update(product.id, { status: 'disponivel' });
          } else {
            // Para não serializados, aumentar a quantidade
            await base44.entities.Product.update(product.id, { 
              quantity: product.quantity + item.quantity 
            });
          }
          
          // Registrar movimento de estoque
          await base44.entities.StockMovement.create({
            product_id: product.id,
            product_name: product.name,
            type: 'entrada',
            quantity: item.quantity,
            reason: `Venda ${sale.sale_number} cancelada`,
            reference_id: sale.id
          });
        }
      }
      
      await base44.entities.Sale.update(sale.id, { status: 'cancelado' });
      toast.success('Venda cancelada e produtos devolvidos ao estoque');
      setCancelConfirmOpen(false);
      setSaleToCancel(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao cancelar venda');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    const sale = selectedSale;
    setDeleteOpen(false);

    // Excluir parcelas vinculadas via função backend (usa service role)
    try {
      await base44.functions.invoke('deleteInstallmentsBySaleId', { sale_id: sale.id });
    } catch (e) { console.error('Erro ao excluir parcelas:', e); }

    // Excluir contratos vinculados
    try {
      const allContracts = await base44.entities.Contract.list('-created_date', 500);
      const linked = allContracts.filter(c => c.sale_id === sale.id);
      for (const c of linked) await base44.entities.Contract.delete(c.id);
    } catch (e) { console.warn('contratos:', e); }

    // Excluir histórico de serviço vinculado
    try {
      const allHistory = await base44.entities.ServiceHistory.list('-created_date', 500);
      const linked = allHistory.filter(h => h.type === 'venda' && h.description?.includes(sale.sale_number));
      for (const h of linked) await base44.entities.ServiceHistory.delete(h.id);
    } catch (e) { console.warn('histórico:', e); }

    // Excluir movimentos de estoque vinculados
    try {
      const allMovements = await base44.entities.StockMovement.list('-created_date', 500);
      const linked = allMovements.filter(m => m.reference_id === sale.id);
      for (const m of linked) await base44.entities.StockMovement.delete(m.id);
    } catch (e) { console.warn('movimentos:', e); }

    // Excluir a venda (passo principal)
    try {
      await base44.entities.Sale.delete(sale.id);
      await logDeletion('Venda', `Venda ${sale.sale_number} do cliente ${sale.client_name} excluída`, sale.id);
      toast.success('Venda excluída com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir venda');
      console.error(error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const stats = {
    total: sales.length,
    totalValue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
    pagas: sales.filter(s => s.status === 'pago').length,
    pendentes: sales.filter(s => s.status === 'pendente').length,
    avgTicket: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length : 0
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          Limpar
        </Button>
        <Button onClick={() => setFilterOpen(false)} className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]">
          Aplicar
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />
      
      <div 
        className={isRefreshing ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vendas</h1>
            <p className="text-sm text-slate-500 mt-1">{sales.length} vendas registradas</p>
          </div>
          <Button onClick={() => { setSelectedSale(null); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8] w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Vendas</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 opacity-60" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Faturamento</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Ticket Médio</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(stats.avgTicket)}</p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
            onClick={() => setStatusFilter('pendente')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Pendentes</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.pendentes}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters - Desktop */}
        <Card className="p-4 hidden lg:block mt-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-sm mb-2">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, número ou vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="w-40">
              <Label className="text-sm mb-2">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </Card>

        {/* Filters - Mobile */}
        <div className="lg:hidden space-y-3 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {statusFilter !== 'all' && (
                  <span className="ml-2 bg-[#6B3FA0] text-white text-xs px-2 py-0.5 rounded-full">
                    Ativos
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Table - Desktop */}
        <Card className="hidden lg:block mt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nº Venda</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                    Nenhuma venda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map(sale => (
                  <TableRow key={sale.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>{formatLocalDate(sale.sale_date || sale.created_date)}</TableCell>
                    <TableCell>{sale.client_name}</TableCell>
                    <TableCell className="text-sm">{sale.seller_name || '-'}</TableCell>
                    <TableCell className="text-center">{sale.items?.length || 0}</TableCell>
                    <TableCell className="text-sm">
                      {sale.payment_details && sale.payment_details.length > 0 ? (
                        <div className="space-y-0.5">
                          {sale.payment_details.map((pd, idx) => (
                            <div key={idx}>
                              {pd.method === 'pix' ? 'PIX' : 
                               pd.method === 'pix_parcelado' ? 'PIX Parcelado' :
                               pd.method === 'cartao_credito' ? 'Cartão' :
                               pd.method === 'dinheiro' ? 'Dinheiro' : pd.method}
                              {pd.installments > 1 && ` (${pd.installments}x)`}
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {sale.nota_fiscal ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => {
                            setSelectedSaleForInvoice(sale);
                            setInvoiceDialogOpen(true);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {sale.nota_fiscal}
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-8 text-[#6B3FA0] hover:text-[#834CB8]"
                          onClick={() => {
                            setSelectedSaleForInvoice(sale);
                            setInvoiceDialogOpen(true);
                          }}
                        >
                          Lançar NF
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                        sale.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {sale.status === 'pago' ? 'Pago' : sale.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(getTotalPayments(sale))}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedSaleForDetails(sale); setDetailsDialogOpen(true); }}>
                          <Info className="h-4 w-4 mr-2" />
                          Detalhes da Venda
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl(`ClientDetail?id=${sale.client_id}`)} className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Cliente
                          </Link>
                        </DropdownMenuItem>
                          {sale.client_phone && (
                            <DropdownMenuItem onClick={() => sendWhatsApp(sale)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { setSelectedSale(sale); setContractOpen(true); }}>
                            <FileSignature className="h-4 w-4 mr-2" />
                            Gerar Contrato
                          </DropdownMenuItem>
                          {sale.status === 'cancelado' && (
                            <DropdownMenuItem onClick={() => { setSaleToEdit(sale); setEditFormOpen(true); }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar Venda
                            </DropdownMenuItem>
                          )}
                          {sale.status !== 'cancelado' && (
                            <DropdownMenuItem onClick={() => openCancelConfirm(sale)} className="text-amber-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar Venda
                            </DropdownMenuItem>
                          )}
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem onClick={() => { setSelectedSale(sale); setDeleteOpen(true); }} className="text-red-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Cards - Mobile */}
        <div className="lg:hidden space-y-3 mt-6">
          {filteredSales.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              Nenhuma venda encontrada
            </Card>
          ) : (
            filteredSales.map(sale => (
              <Card key={sale.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{sale.sale_number}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                          sale.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {sale.status === 'pago' ? 'Pago' : sale.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {sale.client_name} • {formatLocalDate(sale.sale_date || sale.created_date)}
                      </div>
                      <div className="mt-2">
                        {sale.nota_fiscal ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedSaleForInvoice(sale);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            NF: {sale.nota_fiscal}
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-xs h-7 text-[#6B3FA0]"
                            onClick={() => {
                              setSelectedSaleForInvoice(sale);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            Lançar NF
                          </Button>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedSaleForDetails(sale); setDetailsDialogOpen(true); }}>
                        <Info className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(`ClientDetail?id=${sale.client_id}`)} className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Cliente
                        </Link>
                      </DropdownMenuItem>
                        {sale.client_phone && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              sendWhatsApp(sale);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setSelectedSale(sale); setContractOpen(true); }}>
                          <FileSignature className="h-4 w-4 mr-2" />
                          Contrato
                        </DropdownMenuItem>
                        {sale.status === 'cancelado' && (
                          <DropdownMenuItem onClick={() => { setSaleToEdit(sale); setEditFormOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar Venda
                          </DropdownMenuItem>
                        )}
                        {sale.status !== 'cancelado' && (
                          <DropdownMenuItem onClick={() => openCancelConfirm(sale)} className="text-amber-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        )}
                        {currentUser?.role === 'admin' && (
                          <DropdownMenuItem onClick={() => { setSelectedSale(sale); setDeleteOpen(true); }} className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(getTotalPayments(sale))}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <NewSaleForm open={formOpen} onOpenChange={setFormOpen} onSuccess={loadData} />

      <NewSaleForm open={editFormOpen} onOpenChange={setEditFormOpen} sale={saleToEdit} onSuccess={loadData} />

      <ContractGenerator 
        open={contractOpen}
        onOpenChange={setContractOpen}
        sale={selectedSale}
        onSuccess={loadData}
      />

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) setDeleteOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir a venda <strong>{selectedSale?.sale_number}</strong> de <strong>{selectedSale?.client_name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-1">
            ⚠️ Todos os registros vinculados serão excluídos: parcelas de <strong>Contas a Receber</strong>, contratos, histórico de serviço e movimentações de estoque.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cancelamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja cancelar a venda <strong>{saleToCancel?.sale_number}</strong> de <strong>{saleToCancel?.client_name}</strong>? Os produtos serão devolvidos ao estoque.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelConfirmOpen(false); setSaleToCancel(null); }}>Não</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleCancel(saleToCancel)}>Sim, Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        sale={selectedSaleForInvoice}
        onSuccess={loadData}
      />

      <SaleDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        sale={selectedSaleForDetails}
      />
    </div>
  );
}