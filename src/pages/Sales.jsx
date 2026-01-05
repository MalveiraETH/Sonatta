import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import SaleForm from '@/components/sales/SaleForm';
import NewSaleForm from '@/components/sales/NewSaleForm';
import ContractGenerator from '@/components/contracts/ContractGenerator';
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle,
  FileSignature,
  Eye,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [newSaleFormOpen, setNewSaleFormOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [salesData, user] = await Promise.all([
        base44.entities.Sale.list('-created_date'),
        base44.auth.me()
      ]);
      setSales(salesData);
      setCurrentUser(user);
 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.client_name?.toLowerCase().includes(term) ||
        s.sale_number?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setFormOpen(true);
  };

  const handleGenerateContract = (sale) => {
    setSelectedSale(sale);
    setContractOpen(true);
  };

  const handleDelete = async (sale) => {
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem excluir vendas');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
      // Retornar produtos ao estoque
      for (const item of sale.items) {
        if (item.product_id) {
          await base44.entities.Product.update(item.product_id, {
            status: 'disponivel'
          });

          // Registrar movimentação de entrada (cancelamento)
          await base44.entities.StockMovement.create({
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'entrada',
            quantity: 1,
            reason: `Cancelamento da venda ${sale.sale_number}`,
            reference_id: sale.id
          });
        }
      }

      // Excluir parcelas de PIX parcelado relacionadas
      const installments = await base44.entities.Installment.filter({ sale_id: sale.id });
      for (const installment of installments) {
        await base44.entities.Installment.delete(installment.id);
      }

      await base44.entities.Sale.delete(sale.id);
      toast.success('Venda excluída e produtos retornados ao estoque');
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error(`Erro ao excluir venda: ${error.message || 'Tente novamente'}`);
    }
  };

  const handleStatusChange = async (sale, newStatus) => {
    try {
      await base44.entities.Sale.update(sale.id, { status: newStatus });
      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const sendWhatsApp = (sale) => {
    if (!sale.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    const phone = sale.client_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${sale.client_name}!\n\nSua compra foi registrada:\n\n*Nº ${sale.sale_number}*\nValor: ${formatCurrency(sale.total)}\n\nAgradecemos a preferência!\n\n*Sonatta Soluções Auditivas*`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
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
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
    boleto: 'Boleto',
    transferencia: 'Transferência'
  };

  // Stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthSales = sales.filter(s => {
    const date = new Date(s.created_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const paidSales = monthSales.filter(s => s.status === 'pago');
  const paidRevenue = paidSales.reduce((sum, s) => sum + (s.total || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description={`${sales.length} vendas registradas`}
        action={() => {
          setSelectedSale(null);
          setNewSaleFormOpen(true);
        }}
        actionLabel="Nova Venda"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Vendas do Mês"
          value={monthSales.length}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(monthRevenue)}
          icon={TrendingUp}
          color="gold"
        />
        <StatCard
          title="Recebido"
          value={formatCurrency(paidRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(monthSales.length > 0 ? monthRevenue / monthSales.length : 0)}
          icon={CreditCard}
          color="purple"
        />
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{sale.sale_number}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(sale.created_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {sale.nota_fiscal && (
                          <p className="text-xs text-emerald-600 font-medium">NF: {sale.nota_fiscal}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.client_name}</p>
                        <p className="text-xs text-slate-500">{sale.seller_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        {sale.payment_details && sale.payment_details.length > 0 ? (
                          <>
                            {sale.payment_details.map((pd, idx) => (
                              <p key={idx} className="text-xs">
                                {paymentMethods[pd.method] || pd.method}
                                {pd.installments > 1 && ` (${pd.installments}x)`}
                              </p>
                            ))}
                          </>
                        ) : (
                          <>
                            <p>{paymentMethods[sale.payment_method]}</p>
                            {sale.installments > 1 && (
                              <p className="text-xs text-slate-500">
                                {sale.installments}x de {formatCurrency(sale.installment_value)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-[#1e3a5f]">{formatCurrency(sale.total)}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={sale.status}
                        onValueChange={(value) => handleStatusChange(sale, value)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <StatusBadge status={sale.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sale)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem onClick={() => handleEdit(sale)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Venda
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleGenerateContract(sale)}>
                            <FileSignature className="h-4 w-4 mr-2" />
                            Gerar Contrato
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendWhatsApp(sale)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          {currentUser?.role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(sale)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhuma venda encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SaleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        sale={selectedSale}
        onSuccess={loadData}
      />

      <NewSaleForm
        open={newSaleFormOpen}
        onOpenChange={setNewSaleFormOpen}
        onSuccess={loadData}
      />

      <ContractGenerator
        open={contractOpen}
        onOpenChange={setContractOpen}
        sale={selectedSale}
        onSuccess={loadData}
      />
    </div>
  );
}