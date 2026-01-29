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
  BeakerIcon
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
import { ptBR } from 'date-fns/locale';

export default function ClientDetail() {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');

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
    window.open(`https://wa.me/55${phone}`, '_blank');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Clients')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Telefone</p>
                <p className="font-medium">{client.phone || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">E-mail</p>
                <p className="font-medium truncate">{client.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Responsável</p>
                <p className="font-medium">{client.responsible_professional || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
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

        async function handleDelete() {
        if (currentUser?.role !== 'admin') {
        toast.error('Apenas administradores podem excluir clientes');
        return;
        }

      try {
        await base44.entities.Client.delete(client.id);
        toast.success('Cliente excluído com sucesso');
        window.location.href = createPageUrl('Clients');
        } catch (error) {
        console.error('Error:', error);
        toast.error(`Erro ao excluir: ${error.message || 'Tente novamente'}`);
        }
        }
}