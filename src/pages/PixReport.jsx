import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { 
  Search, 
  FileText, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

      // Processar dados para o relatório
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

    // Filtrar vendas com PIX parcelado
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

      // Determinar status geral
      clientData.status = clientData.overdueCount > 0 ? 'inadimplente' : 'adimplente';
    });

    return Array.from(clientMap.values()).sort((a, b) => 
      new Date(a.oldestDueDate) - new Date(b.oldestDueDate)
    );
  };

  const filterClients = () => {
    let filtered = [...clientsReport];

    // Filtro por status
    if (statusFilter === 'adimplente') {
      filtered = filtered.filter(c => c.status === 'adimplente');
    } else if (statusFilter === 'inadimplente') {
      filtered = filtered.filter(c => c.status === 'inadimplente');
    }

    // Filtro por busca
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

  const generateWhatsAppMessage = (clientData) => {
    const client = clientData.client;
    const overdueInstallments = clientData.installments.filter(inst => {
      const dueDate = new Date(inst.due_date);
      return inst.payment_status !== 'pago' && dueDate < new Date();
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    let message = `Olá ${client.full_name}! 👋\n\n`;
    
    if (clientData.status === 'inadimplente') {
      message += `Identificamos que você possui ${clientData.overdueCount} parcela(s) de PIX Parcelado em atraso.\n\n`;
      message += `*Detalhes das Parcelas Atrasadas:*\n`;
      
      overdueInstallments.slice(0, 3).forEach(inst => {
        message += `• Parcela ${inst.installment_number} - Venc: ${format(new Date(inst.due_date), 'dd/MM/yyyy')}\n`;
        message += `  Valor: ${formatCurrency(inst.remaining_amount)}\n`;
      });
      
      message += `\n*Total em Atraso:* ${formatCurrency(clientData.totalRemaining)}\n\n`;
      message += `Para regularizar sua situação, entre em contato conosco! 😊\n\n`;
    } else {
      const nextInstallment = clientData.installments
        .filter(inst => inst.payment_status !== 'pago')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
      
      if (nextInstallment) {
        message += `Sua próxima parcela do PIX Parcelado vence em ${format(new Date(nextInstallment.due_date), 'dd/MM/yyyy')}.\n\n`;
        message += `*Valor:* ${formatCurrency(nextInstallment.remaining_amount)}\n\n`;
        message += `Agradecemos pela sua pontualidade! 🎉\n\n`;
      } else {
        message += `Parabéns! Todas as suas parcelas do PIX Parcelado estão quitadas! 🎉\n\n`;
      }
    }
    
    message += `*Sonatta - Soluções Auditivas*\n`;
    message += `📞 (92) 99169-2102`;
    
    return encodeURIComponent(message);
  };

  const sendWhatsApp = (clientData) => {
    const phone = clientData.client.phone?.replace(/\D/g, '');
    const message = generateWhatsAppMessage(clientData);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório PIX Parcelado"
        description="Gestão de clientes adimplentes e inadimplentes"
      />

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Clientes</p>
                <p className="text-2xl font-bold text-slate-800">{clientsReport.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-700">Adimplentes</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {clientsReport.filter(c => c.status === 'adimplente').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-700">Inadimplentes</p>
                <p className="text-2xl font-bold text-red-900">
                  {clientsReport.filter(c => c.status === 'inadimplente').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="adimplente">Adimplentes</SelectItem>
                <SelectItem value="inadimplente">Inadimplentes</SelectItem>
              </SelectContent>
            </Select>

            <PixReportPDF clientsReport={filteredClients} />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <div className="grid gap-4">
        {filteredClients.length > 0 ? (
          filteredClients.map((clientData) => (
            <Card 
              key={clientData.client.id} 
              className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                clientData.status === 'inadimplente' ? 'bg-red-50/50' : 'bg-white'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info do Cliente */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        clientData.status === 'inadimplente' 
                          ? 'bg-red-500' 
                          : 'bg-emerald-500'
                      }`}>
                        {clientData.status === 'inadimplente' ? (
                          <AlertCircle className="h-6 w-6 text-white" />
                        ) : (
                          <CheckCircle className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Link 
                          to={createPageUrl(`ClientDetail?id=${clientData.client.id}`)}
                          className="text-lg font-semibold text-slate-800 hover:text-[#6B3FA0]"
                        >
                          {clientData.client.full_name}
                        </Link>
                        <p className="text-sm text-slate-500">
                          {clientData.client.cpf} • {clientData.client.phone}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            clientData.status === 'inadimplente'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {clientData.status === 'inadimplente' ? 'Inadimplente' : 'Adimplente'}
                          </span>
                          {clientData.overdueCount > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                              {clientData.overdueCount} parcela(s) atrasada(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dados Financeiros */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
                    <div>
                      <p className="text-xs text-slate-500">Total Devido</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(clientData.totalDue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Pago</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(clientData.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Saldo Restante</p>
                      <p className={`font-semibold ${clientData.overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatCurrency(clientData.totalRemaining)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Parcelas</p>
                      <p className="font-semibold text-slate-800">
                        {clientData.paidCount}/{clientData.installments.length}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => sendWhatsApp(clientData)}
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Link to={createPageUrl(`ClientDetail?id=${clientData.client.id}`)}>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">Nenhum cliente encontrado com os filtros aplicados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}