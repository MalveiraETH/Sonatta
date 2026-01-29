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
import { Search, Filter, MoreVertical, Eye, MessageCircle, FileDown, X, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';
import PixReportPDF from '@/components/reports/PixReportPDF';

export default function PixReport() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clientsReport, setClientsReport] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, statusFilter, clientsReport]);

  const loadData = async () => {
    try {
      const [clientsData, salesData, installmentsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Sale.list(),
        base44.entities.Installment.list()
      ]);

      setClients(clientsData);
      setSales(salesData);
      setInstallments(installmentsData);

      const report = processPixReport(clientsData, salesData, installmentsData);
      setClientsReport(report);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processPixReport = (clientsData, salesData, installmentsData) => {
    const today = new Date();
    const clientMap = new Map();

    const pixSales = salesData.filter(sale => 
      sale.payment_details?.some(p => p.method === 'pix_parcelado')
    );

    pixSales.forEach(sale => {
      const clientInstallments = installmentsData.filter(inst => inst.sale_id === sale.id);
      
      if (clientInstallments.length === 0) return;

      const clientId = sale.client_id;
      const client = clientsData.find(c => c.id === clientId);
      
      if (!client) return;

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client,
          totalDue: 0,
          totalPaid: 0,
          totalRemaining: 0,
          overdueCount: 0,
          pendingCount: 0,
          paidCount: 0,
          oldestDueDate: null,
          installments: []
        });
      }

      const clientData = clientMap.get(clientId);

      clientInstallments.forEach(inst => {
        const dueDate = new Date(inst.due_date);
        const isOverdue = inst.payment_status !== 'pago' && dueDate < today;

        clientData.totalDue += inst.original_amount || 0;
        clientData.totalPaid += inst.paid_amount || 0;
        clientData.totalRemaining += inst.remaining_amount || 0;
        clientData.installments.push(inst);

        if (inst.payment_status === 'pago') {
          clientData.paidCount++;
        } else if (isOverdue) {
          clientData.overdueCount++;
        } else {
          clientData.pendingCount++;
        }

        if (!clientData.oldestDueDate || dueDate < new Date(clientData.oldestDueDate)) {
          clientData.oldestDueDate = inst.due_date;
        }
      });

      clientData.status = clientData.overdueCount > 0 ? 'inadimplente' : 'adimplente';
    });

    return Array.from(clientMap.values()).sort((a, b) => 
      new Date(a.oldestDueDate) - new Date(b.oldestDueDate)
    );
  };

  const filterClients = () => {
    let filtered = [...clientsReport];

    if (statusFilter === 'adimplente') {
      filtered = filtered.filter(c => c.status === 'adimplente');
    } else if (statusFilter === 'inadimplente') {
      filtered = filtered.filter(c => c.status === 'inadimplente');
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.client.full_name?.toLowerCase().includes(term) ||
        c.client.cpf?.includes(term) ||
        c.client.phone?.includes(term)
      );
    }

    setFilteredClients(filtered);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const sendWhatsApp = (clientData) => {
    const phone = clientData.client.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente não possui telefone');
      return;
    }
    const message = generateWhatsAppMessage(clientData);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const generateWhatsAppMessage = (clientData) => {
    const client = clientData.client;
    const overdueInstallments = clientData.installments.filter(inst => {
      const dueDate = new Date(inst.due_date);
      return inst.payment_status !== 'pago' && dueDate < new Date();
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    let message = `Olá ${client.full_name}! 👋\n\n`;
    
    if (clientData.status === 'inadimplente') {
      message += `Identificamos ${clientData.overdueCount} parcela(s) de PIX Parcelado em atraso.\n\n`;
      message += `*Total em Atraso:* ${formatCurrency(clientData.totalRemaining)}\n\n`;
      message += `Entre em contato conosco para regularizar! 😊`;
    } else {
      message += `Sua próxima parcela vence em breve.\n\nAgradecemos pela sua pontualidade! 🎉`;
    }
    
    message += `\n\n*Sonatta - Soluções Auditivas*\n📞 (92) 99169-2102`;
    
    return encodeURIComponent(message);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
  };

  const stats = {
    total: clientsReport.length,
    adimplentes: clientsReport.filter(c => c.status === 'adimplente').length,
    inadimplentes: clientsReport.filter(c => c.status === 'inadimplente').length,
    totalReceivable: clientsReport.reduce((sum, c) => sum + c.totalRemaining, 0)
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
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="adimplente">Adimplentes</SelectItem>
            <SelectItem value="inadimplente">Inadimplentes</SelectItem>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">PIX Parcelado</h1>
          <p className="text-sm text-slate-500 mt-1">Relatório de adimplência e inadimplência</p>
        </div>
        <PixReportPDF clientsReport={filteredClients} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('todos')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Clientes</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('adimplente')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Adimplentes</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.adimplentes}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" 
          onClick={() => setStatusFilter('inadimplente')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Inadimplentes</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.inadimplentes}</p>
            </div>
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 opacity-60" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">A Receber</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceivable)}</p>
            </div>
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
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
                placeholder="Buscar por nome, CPF ou telefone..."
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

          <div className="w-48">
            <Label className="text-sm mb-2">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="adimplente">Adimplentes</SelectItem>
                <SelectItem value="inadimplente">Inadimplentes</SelectItem>
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
              {statusFilter !== 'todos' && (
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
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Parcelas</TableHead>
              <TableHead className="text-right">Total Devido</TableHead>
              <TableHead className="text-right">Total Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map(clientData => {
                const Icon = clientData.status === 'inadimplente' ? AlertCircle : CheckCircle2;
                return (
                  <TableRow key={clientData.client.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{clientData.client.full_name}</TableCell>
                    <TableCell>{clientData.client.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        clientData.status === 'inadimplente' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                        {clientData.status === 'inadimplente' ? 'Inadimplente' : 'Adimplente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{clientData.paidCount}/{clientData.installments.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(clientData.totalDue)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(clientData.totalPaid)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(clientData.totalRemaining)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl(`ClientDetail?id=${clientData.client.id}`)} className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendWhatsApp(clientData)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredClients.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Nenhum cliente encontrado
          </Card>
        ) : (
          filteredClients.map(clientData => {
            const Icon = clientData.status === 'inadimplente' ? AlertCircle : CheckCircle2;
            return (
              <Card key={clientData.client.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{clientData.client.full_name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          clientData.status === 'inadimplente' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <Icon className="h-3 w-3" />
                          {clientData.status === 'inadimplente' ? 'Inadimplente' : 'OK'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {clientData.client.phone} • {clientData.paidCount}/{clientData.installments.length} parcelas
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
                          <Link to={createPageUrl(`ClientDetail?id=${clientData.client.id}`)} className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendWhatsApp(clientData)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(clientData.totalRemaining)}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Total Devido:</span>
                      <p className="font-medium">{formatCurrency(clientData.totalDue)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Pago:</span>
                      <p className="font-medium text-emerald-600">{formatCurrency(clientData.totalPaid)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}