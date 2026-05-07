import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import QuoteForm from '@/components/quotes/QuoteForm';
import SaleForm from '@/components/sales/SaleForm';
import NewSaleForm from '@/components/sales/NewSaleForm';
import InstallmentsControl from '@/components/clients/InstallmentsControl';
import TestForm from '@/components/tests/TestForm';
import ClientForm from '@/components/clients/ClientForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShoppingCart,
  User,
  Plus,
  Ear,
  Trash2,
  BeakerIcon,
  Package,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { openWhatsApp } from '@/utils/whatsapp';
import { ptBR } from 'date-fns/locale';
import { useTabs } from '@/lib/TabsContext';

export default function ClientDetail() {
  const tabsContext = useTabs();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [sales, setSales] = useState([]);
  const [history, setHistory] = useState([]);
  const [clientDevices, setClientDevices] = useState([]);
  const [tests, setTests] = useState([]);
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [newSaleFormOpen, setNewSaleFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tabParams = tabsContext?.getTabParams?.('ClientDetail') || {};
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = tabParams.id || urlParams.get('id');

    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      const [clientData, appointmentsData, quotesData, salesData, historyData, testsData, user] = await Promise.all([
        base44.entities.Client.filter({ id: clientId }),
        base44.entities.Appointment.filter({ client_id: clientId }, '-date'),
        base44.entities.Quote.filter({ client_id: clientId }, '-created_date'),
        base44.entities.Sale.filter({ client_id: clientId }, '-created_date'),
        base44.entities.ServiceHistory.filter({ client_id: clientId }, '-created_date'),
        base44.entities.Test.filter({ client_id: clientId }, '-created_date'),
        base44.auth.me()
      ]);

      setClient(clientData[0] || null);
      setAppointments(appointmentsData);
      setQuotes(quotesData);
      setSales(salesData);
      setHistory(historyData);
      setTests(testsData);
      setCurrentUser(user);

      // Extrair aparelhos comprados pelo cliente
      const devices = [];
      for (const sale of salesData) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.serial_number) {
              devices.push({
                ...item,
                sale_date: sale.created_date,
                sale_number: sale.sale_number,
                warranty_end: calculateWarrantyEnd(sale.created_date, 2) // assumindo 2 anos padrão
              });
            }
          }
        }
      }
      setClientDevices(devices);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    if (!client?.phone) return;
    const phone = client.phone.replace(/\D/g, '');
    openWhatsApp(`55${phone}`);
  };

  const sendEmail = () => {
    if (!client?.email) return;
    window.open(`mailto:${client.email}`, '_blank');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateSaleTotal = (sale) => {
    if (!sale.items || sale.items.length === 0) return sale.total || 0;
    const subtotal = sale.items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)), 0);
    return subtotal - (sale.discount || 0);
  };

  const calculateWarrantyEnd = (saleDate, years = 2) => {
    const date = new Date(saleDate);
    date.setFullYear(date.getFullYear() + years);
    return date;
  };

  const isWarrantyActive = (warrantyEnd) => {
    return new Date() < new Date(warrantyEnd);
  };

  const getWarrantyDaysRemaining = (warrantyEnd) => {
    const diff = new Date(warrantyEnd) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const typeLabels = {
    avaliacao: 'Avaliação',
    teste: 'Teste',
    ajuste: 'Ajuste',
    manutencao: 'Manutenção',
    retorno: 'Retorno',
    venda: 'Venda'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Cliente não encontrado</p>
        <Link to={createPageUrl('Clients')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem excluir clientes');
      return;
    }
    try {
      await base44.entities.Client.delete(client.id);
      toast.success('Cliente excluído com sucesso');
      if (tabsContext?.closeTab) tabsContext.closeTab('ClientDetail');
      else window.location.href = createPageUrl('Clients');
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao excluir: ${error.message || 'Tente novamente'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => tabsContext?.closeTab ? tabsContext.closeTab('ClientDetail') : (window.location.href = createPageUrl('Clients'))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{client.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={client.status} />
              {client.cpf && (
                <span className="text-sm text-slate-500">CPF: {client.cpf}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditFormOpen(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={sendWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button onClick={() => setAppointmentFormOpen(true)} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
            {currentUser?.role === 'admin' && (
              <Button 
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
        </div>
      </div>

      {/* Info Card - Dados Completos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-700">Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Telefone (WhatsApp)</p>
                <p className="font-medium text-sm">{client.phone || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">E-mail</p>
                <p className="font-medium text-sm break-all">{client.email || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">CPF</p>
                <p className="font-medium text-sm">{client.cpf || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Data de Nascimento</p>
                <p className="font-medium text-sm">
                  {client.birth_date ? format(new Date(client.birth_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:col-span-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Endereço</p>
                <p className="font-medium text-sm">{client.address || '-'}</p>
              </div>
            </div>

            {(client.payer_name || client.payer_document) && (
              <>
                <div className="sm:col-span-full border-t pt-3 mt-1">
                  <p className="text-xs font-semibold text-[#6B3FA0] mb-3">Responsável pelo Pagamento</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Nome do Responsável</p>
                    <p className="font-medium text-sm">{client.payer_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">CPF ou CNPJ do Responsável</p>
                    <p className="font-medium text-sm">{client.payer_document || '-'}</p>
                  </div>
                </div>
              </>
            )}

            {client.notes && (
              <div className="sm:col-span-full flex items-start gap-3 border-t pt-3 mt-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Observações</p>
                  <p className="text-sm text-slate-700">{client.notes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="bg-slate-100 flex-wrap h-auto">
          <TabsTrigger value="devices">Aparelhos</TabsTrigger>
          <TabsTrigger value="tests">Testes</TabsTrigger>
          <TabsTrigger value="installments">Parcelas PIX</TabsTrigger>
          <TabsTrigger value="card-installments">Parcelas Cartão</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="quotes">Orçamentos</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Aparelhos do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {clientDevices.length > 0 ? (
                <div className="space-y-4">
                  {clientDevices.map((device, idx) => {
                    const warrantyDays = getWarrantyDaysRemaining(device.warranty_end);
                    const warrantyActive = isWarrantyActive(device.warranty_end);
                    
                    return (
                      <div key={idx} className="p-4 rounded-lg border-2 border-slate-200 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center">
                              <Ear className="h-6 w-6 text-[#6B3FA0]" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">{device.product_name}</h4>
                              <p className="text-sm text-slate-500">Série: {device.serial_number}</p>
                            </div>
                          </div>
                          {warrantyActive ? (
                            warrantyDays <= 60 ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Garantia: {warrantyDays} dias
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                Em Garantia
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              Garantia Expirada
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Data da Venda:</span>
                            <p className="font-medium">{format(new Date(device.sale_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Garantia até:</span>
                            <p className="font-medium">{format(new Date(device.warranty_end), "dd/MM/yyyy", { locale: ptBR })}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Venda:</span>
                            <p className="font-medium">{device.sale_number}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Valor:</span>
                            <p className="font-medium">{formatCurrency(device.unit_price)}</p>
                          </div>
                        </div>
                        
                        {/* Histórico específico do aparelho */}
                        {history.filter(h => h.products_tested?.some(p => p.serial_number === device.serial_number)).length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-medium text-slate-500 mb-2">Histórico de Serviços:</p>
                            <div className="space-y-2">
                              {history
                                .filter(h => h.products_tested?.some(p => p.serial_number === device.serial_number))
                                .slice(0, 3)
                                .map((h, i) => (
                                  <div key={i} className="text-sm bg-slate-50 p-2 rounded">
                                    <span className="font-medium text-[#6B3FA0]">{typeLabels[h.type]}</span>
                                    <span className="text-slate-500 ml-2">
                                      {format(new Date(h.created_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhum aparelho comprado ainda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Testes Realizados</CardTitle>
              <Button
                size="sm"
                onClick={() => setTestFormOpen(true)}
                className="bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Teste
              </Button>
            </CardHeader>
            <CardContent>
              {tests.length > 0 ? (
                <div className="space-y-3">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <BeakerIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{test.test_number}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(test.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(test.end_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={test.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhum teste realizado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installments">
          <InstallmentsControl 
            clientId={client.id}
            clientName={client.full_name}
            clientPhone={client.phone}
            paymentMethod="pix_parcelado"
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="card-installments">
          <InstallmentsControl 
            clientId={client.id}
            clientName={client.full_name}
            clientPhone={client.phone}
            paymentMethod="cartao_credito"
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="appointments">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agendamentos</CardTitle>
              <Button
                size="sm"
                onClick={() => setAppointmentFormOpen(true)}
                className="bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Agendamento
              </Button>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{typeLabels[appt.type]}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(appt.date), "dd/MM/yyyy", { locale: ptBR })} às {appt.time}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhum agendamento</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Orçamentos</CardTitle>
              <Button
                size="sm"
                onClick={() => setQuoteFormOpen(true)}
                className="bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Orçamento
              </Button>
            </CardHeader>
            <CardContent>
              {quotes.length > 0 ? (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{quote.quote_number}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(quote.created_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(quote.total)}</p>
                        <StatusBadge status={quote.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhum orçamento</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendas Realizadas</CardTitle>
              <Button 
                onClick={() => setNewSaleFormOpen(true)}
                className="bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </CardHeader>
            <CardContent>
              {sales.length > 0 ? (
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium">{sale.sale_number}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(sale.created_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(calculateSaleTotal(sale))}</p>
                        <StatusBadge status={sale.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Nenhuma venda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos Comprados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const allProducts = sales.flatMap(sale =>
                  (sale.items || []).map(item => ({
                    ...item,
                    sale_number: sale.sale_number,
                    sale_date: sale.sale_date || sale.created_date,
                    sale_status: sale.status
                  }))
                );
                if (allProducts.length === 0) {
                  return <p className="text-center text-slate-500 py-4">Nenhum produto comprado ainda</p>;
                }
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Nº Série</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Venda</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allProducts.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-slate-500">{item.serial_number || '-'}</TableCell>
                            <TableCell>{item.quantity || 1}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(item.total || (item.unit_price * (item.quantity || 1)))}</TableCell>
                            <TableCell className="text-sm text-[#6B3FA0]">{item.sale_number}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {item.sale_date ? format(new Date(item.sale_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <AppointmentForm
        open={appointmentFormOpen}
        onOpenChange={setAppointmentFormOpen}
        preselectedClient={client}
        onSuccess={loadData}
      />

      <QuoteForm
        open={quoteFormOpen}
        onOpenChange={setQuoteFormOpen}
        preselectedClient={client}
        onSuccess={loadData}
      />

      <SaleForm
        open={saleFormOpen}
        onOpenChange={setSaleFormOpen}
        preselectedClient={client}
        onSuccess={loadData}
      />

      <NewSaleForm
        open={newSaleFormOpen}
        onOpenChange={setNewSaleFormOpen}
        preselectedClient={client}
        onSuccess={loadData}
      />

      <TestForm
        open={testFormOpen}
        onClose={() => setTestFormOpen(false)}
        onSuccess={loadData}
        preselectedClientId={client.id}
      />

      <ClientForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        client={client}
        onSuccess={loadData}
      />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{client?.full_name}"? Esta ação não pode ser desfeita e removerá todos os dados relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    );
}