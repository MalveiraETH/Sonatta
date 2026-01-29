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
import { Search, Filter, MoreVertical, Eye, MessageCircle, FileSignature, X, Plus, ShoppingCart, TrendingUp, DollarSign, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

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

  const sendWhatsApp = (sale) => {
    if (!sale.client_phone) {
      toast.error('Cliente não possui telefone');
      return;
    }
    const phone = sale.client_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${sale.client_name}!\n\nSua compra foi confirmada!\n\n*Venda:* ${sale.sale_number}\n*Valor:* ${formatCurrency(sale.total)}\n\nObrigado pela preferência!\n\n*Sonatta*`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleCancel = async (sale) => {
    try {
      await base44.entities.Sale.update(sale.id, { status: 'cancelado' });
      toast.success('Venda cancelada');
      loadData();
    } catch (error) {
      toast.error('Erro ao cancelar venda');
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Sale.delete(selectedSale.id);
      toast.success('Venda excluída');
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir venda');
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      <Card className="p-4 hidden lg:block">
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
      <div className="lg:hidden space-y-3">
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
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nº Venda</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                      sale.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {sale.status === 'pago' ? 'Pago' : sale.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(sale.total)}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                        {sale.status !== 'cancelado' && (
                          <DropdownMenuItem onClick={() => handleCancel(sale)} className="text-amber-600">
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
      <div className="lg:hidden space-y-3">
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
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                        Contrato
                      </DropdownMenuItem>
                      {sale.status !== 'cancelado' && (
                        <DropdownMenuItem onClick={() => handleCancel(sale)} className="text-amber-600">
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
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(sale.total)}</div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      <NewSaleForm open={formOpen} onOpenChange={setFormOpen} onSuccess={loadData} />

      <ContractGenerator 
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        sale={selectedSale}
        onSuccess={loadData}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}