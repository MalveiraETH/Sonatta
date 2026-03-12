import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import { FileText, Download, Package, Users, ShoppingCart, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dueDateStart, setDueDateStart] = useState('');
  const [dueDateEnd, setDueDateEnd] = useState('');
  const [paymentDateStart, setPaymentDateStart] = useState('');
  const [paymentDateEnd, setPaymentDateEnd] = useState('');
  const [installments, setInstallments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tests, setTests] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  useEffect(() => {
    loadData();

    // Atualiza relatório de testes em tempo real
    const unsubscribe = base44.entities.Test.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create' || event.type === 'delete') {
        base44.entities.Test.list().then(setTests);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, clientsData, salesData, professionalsData, appointmentsData, installmentsData, expensesData, testsData, movementsData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Client.list(),
        base44.entities.Sale.list('-created_date'),
        base44.entities.Professional.list(),
        base44.entities.Appointment.list(),
        base44.entities.Installment.list(),
        base44.entities.Expense.list(),
        base44.entities.Test.list(),
        base44.entities.StockMovement.filter({ type: 'saida' })
      ]);
      setProducts(productsData);
      setClients(clientsData);
      setSales(salesData);
      setProfessionals(professionalsData);
      setAppointments(appointmentsData);
      setInstallments(installmentsData);
      setExpenses(expensesData);
      setTests(testsData);
      setStockMovements(movementsData);
    } catch (error) {
      console.error(error);
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

  const getTotalPayments = (sale) => {
    return sale.payment_details?.reduce((sum, p) => sum + (p.amount || 0), 0) || sale.total || 0;
  };

  const exportToExcel = async (data, filename) => {
    if (data.length === 0) return;
    
    // Usar XLSX do pacote instalado
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filterSalesByDate = () => {
    if (!dateStart || !dateEnd) return sales;
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_date);
      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      return saleDate >= start && saleDate <= end;
    });
  };

  const filteredSales = filterSalesByDate();

  // Estatísticas de Estoque
  const stockStats = {
    total: products.length,
    disponivel: products.filter(p => p.status === 'disponivel').length,
    vendido: products.filter(p => p.status === 'vendido').length,
    reservado: products.filter(p => p.status === 'reservado').length,
    valorTotal: products.reduce((sum, p) => {
      if (p.status === 'disponivel') {
        return sum + (p.cost_price || 0);
      }
      return sum;
    }, 0)
  };

  // Estatísticas de Clientes
  const clientStats = {
    total: clients.length,
    lead: clients.filter(c => c.status === 'lead').length,
    em_teste: clients.filter(c => c.status === 'em_teste').length,
    cliente_ativo: clients.filter(c => c.status === 'cliente_ativo').length,
    pos_venda: clients.filter(c => c.status === 'pos_venda').length
  };

  // Estatísticas de Vendas
  const salesStats = {
    total: filteredSales.length,
    valorTotal: filteredSales.reduce((sum, s) => sum + getTotalPayments(s), 0),
    valorMedio: filteredSales.length > 0 ? filteredSales.reduce((sum, s) => sum + getTotalPayments(s), 0) / filteredSales.length : 0,
    pago: filteredSales.filter(s => s.status === 'pago').length,
    pendente: filteredSales.filter(s => s.status === 'pendente').length
  };

  const exportStockReport = async () => {
    const data = products.map(p => {
      const exitMovement = stockMovements.find(m => m.product_id === p.id);
      
      return {
        'Nome': p.name,
        'Categoria': p.category,
        'Marca': p.brand || '',
        'Modelo': p.model || '',
        'Serial': p.serial_number || '',
        'Status': p.status,
        'Custo do Produto': p.cost_price || 0,
        'Venda': p.sale_price || 0,
        'NF de Entrada': p.nota_fiscal_entrada || '',
        'Data Entrada': p.entry_date || '',
        'NF de Saída': exitMovement?.nota_fiscal || '',
        'Data de Saída': exitMovement?.sale_date ? format(new Date(exitMovement.sale_date), 'dd/MM/yyyy') : ''
      };
    });
    exportToExcel(data, 'relatorio_estoque');
  };

  const exportClientReport = () => {
    const data = clients.map(c => ({
      'Nome': c.full_name,
      'CPF': c.cpf || '',
      'Telefone': c.phone,
      'Email': c.email || '',
      'Status': c.status,
      'Data Cadastro': format(new Date(c.created_date), 'dd/MM/yyyy')
    }));
    exportToExcel(data, 'relatorio_clientes');
  };

  const exportSalesReport = () => {
    const data = [];
    const paymentMethodLabels = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      pix_parcelado: 'PIX Parcelado',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      boleto: 'Boleto',
      transferencia: 'Transferência'
    };
    
    filteredSales.forEach(s => {
      const client = clients.find(c => c.id === s.client_id);
      const profIndicacao = professionals.find(p => p.id === client?.referral_professional);
      const profResponsavel = professionals.find(p => p.id === client?.responsible_professional);
      
      // Se tem payment_details (novo formato), criar linha para cada método
      if (s.payment_details && s.payment_details.length > 0) {
        s.payment_details.forEach(pd => {
          // PIX à vista usa data da venda como data de pagamento
          const isPixAVista = pd.method === 'pix' && (!pd.installments || pd.installments === 1);
          let dataPagamento = '-';
          let status = s.status;
          
          if (isPixAVista) {
            dataPagamento = format(new Date(s.sale_date || s.created_date), 'dd/MM/yyyy');
            status = 'pago';
          } else if (s.status === 'pago') {
            dataPagamento = format(new Date(s.updated_date), 'dd/MM/yyyy');
          }
          
          const feeRate = pd.fee_rate || 0;
          const isCard = ['cartao_credito', 'cartao_debito'].includes(pd.method);
          const netAmount = isCard && feeRate > 0 ? (pd.amount || 0) * (1 - feeRate / 100) : (pd.amount || 0);
          data.push({
            'Número': s.sale_number,
            'Cliente': s.client_name,
            'Responsável Pagamento': client?.payer_name || '',
            'CPF/CNPJ Responsável': client?.payer_document || '',
            'Prof. Indicação': profIndicacao?.full_name || '',
            'Prof. Responsável': profResponsavel?.full_name || '',
            'Valor Bruto': pd.amount || 0,
            'Bandeira': pd.card_brand || '',
            'Taxa Cartão (%)': feeRate || '',
            'Valor Líquido': netAmount,
            'Método': paymentMethodLabels[pd.method] || pd.method,
            'Parcelas': pd.installments > 1 ? pd.installments : '',
            'Status': status,
            'Data Pagamento': dataPagamento,
            'NF': s.nota_fiscal || '',
            'Data': format(new Date(s.sale_date || s.created_date), 'dd/MM/yyyy')
          });
        });
      } else {
        // Formato antigo (compatibilidade)
        const isPixAVista = s.payment_method === 'pix' && (!s.installments || s.installments === 1);
        let dataPagamento = '-';
        let status = s.status;
        
        if (isPixAVista) {
          dataPagamento = format(new Date(s.sale_date || s.created_date), 'dd/MM/yyyy');
          status = 'pago';
        } else if (s.status === 'pago') {
          dataPagamento = format(new Date(s.updated_date), 'dd/MM/yyyy');
        }
        
        data.push({
          'Número': s.sale_number,
          'Cliente': s.client_name,
          'Responsável Pagamento': client?.payer_name || '',
          'CPF/CNPJ Responsável': client?.payer_document || '',
          'Prof. Indicação': profIndicacao?.full_name || '',
          'Prof. Responsável': profResponsavel?.full_name || '',
          'Valor Bruto': s.total,
          'Bandeira': '',
          'Taxa Cartão (%)': '',
          'Valor Líquido': s.total,
          'Método': paymentMethodLabels[s.payment_method] || s.payment_method || '',
          'Parcelas': s.installments > 1 ? s.installments : '',
          'Status': status,
          'Data Pagamento': dataPagamento,
          'NF': s.nota_fiscal || '',
          'Data': format(new Date(s.sale_date || s.created_date), 'dd/MM/yyyy')
        });
      }
    });
    
    exportToExcel(data, 'relatorio_vendas');
  };

  const exportReferralReport = () => {
    const referralData = [];
    
    filteredSales.forEach(sale => {
      if (sale.test_referral_id) {
        const prof = professionals.find(p => p.id === sale.test_referral_id);
        if (prof) {
          referralData.push({
            'Profissional': prof.full_name,
            'Especialidade': prof.specialty,
            'Paciente': sale.client_name,
            'Data Venda': format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy'),
            'Valor Total': sale.total,
            'Repasse 10%': (sale.total * 0.10).toFixed(2)
          });
        }
      }
    });
    
    exportToExcel(referralData, 'relatorio_repasse_indicacao');
  };

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
        title="Relatórios"
        description="Visualize e exporte relatórios do sistema"
        actionIcon={FileText}
      />

      <Tabs defaultValue="stock">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="tests">Testes</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="revenue">Receita Mês</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="referral">Repasse Indicação</TabsTrigger>
        </TabsList>

        {/* ESTOQUE */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Produtos</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{stockStats.total}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Disponíveis</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stockStats.disponivel}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Reservados</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stockStats.reservado}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Vendidos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stockStats.vendido}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Valor em Estoque</p>
              <p className="text-xl font-bold text-[#1e3a5f] mt-1">{formatCurrency(stockStats.valorTotal)}</p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produtos Cadastrados</CardTitle>
              <Button onClick={exportStockReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Custo do Produto</TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead>NF Entrada</TableHead>
                      <TableHead>NF Saída</TableHead>
                      <TableHead>Data Saída</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => {
                      const exitMovement = stockMovements.find(m => m.product_id === product.id);
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.brand} {product.model}</TableCell>
                          <TableCell className="text-sm text-slate-600">{product.serial_number}</TableCell>
                          <TableCell><StatusBadge status={product.status} /></TableCell>
                          <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                          <TableCell className="text-sm text-slate-600">{product.nota_fiscal_entrada || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600">{exitMovement?.nota_fiscal || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {exitMovement?.sale_date ? format(new Date(exitMovement.sale_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENTES */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Clientes</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{clientStats.total}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Leads</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{clientStats.lead}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Em Teste</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{clientStats.em_teste}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Ativos</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{clientStats.cliente_ativo}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Pós-Venda</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{clientStats.pos_venda}</p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lista de Clientes</CardTitle>
              <Button onClick={exportClientReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.full_name}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell><StatusBadge status={client.status} /></TableCell>
                        <TableCell>{formatLocalDate(client.created_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TESTES */}
        <TabsContent value="tests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Testes</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{tests.length}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Em Teste</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{tests.filter(t => t.status === 'em_teste').length}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Estendidos</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{tests.filter(t => t.status === 'teste_estendido').length}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Finalizados</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{tests.filter(t => t.status === 'teste_finalizado').length}</p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Testes Cadastrados</CardTitle>
              <Button onClick={() => {
                const data = tests.map(t => ({
                  'Número': t.test_number,
                  'Cliente': t.client_name,
                  'Data Início': format(new Date(t.start_date), 'dd/MM/yyyy'),
                  'Data Final': format(new Date(t.end_date), 'dd/MM/yyyy'),
                  'Profissional': t.professional_name || '',
                  'Indicação': t.referral_professional_name || '',
                  'Aparelhos': t.devices?.map(d => d.serial_number || d.product_name).filter(Boolean).join(', ') || '',
                  'Status': t.status === 'em_teste' ? 'Em Teste' :
                           t.status === 'teste_estendido' ? 'Teste Estendido' :
                           t.status === 'teste_finalizado' ? 'Teste Finalizado' : 'Teste Pendente',
                  'Observações': t.notes || ''
                }));
                exportToExcel(data, 'relatorio_testes');
              }} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Início</TableHead>
                      <TableHead>Data Final</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Aparelhos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map(test => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.test_number}</TableCell>
                        <TableCell>{test.client_name}</TableCell>
                        <TableCell>{formatLocalDate(test.start_date)}</TableCell>
                        <TableCell>{formatLocalDate(test.end_date)}</TableCell>
                        <TableCell className="text-sm">{test.professional_name || '-'}</TableCell>
                        <TableCell className="text-sm">
                         {test.devices?.map(d => d.serial_number || d.product_name).filter(Boolean).join(', ') || '-'}
                        </TableCell>
                        <TableCell><StatusBadge status={test.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECEITA DO MÊS */}
        <TabsContent value="revenue" className="space-y-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDateStart('');
                    setDateEnd('');
                  }}
                >
                  Limpar Filtro
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalhamento da Receita</CardTitle>
              <Button onClick={() => {
                const getFilteredDate = (date) => {
                  const d = new Date(date);
                  if (dateStart && dateEnd) {
                    const start = new Date(dateStart);
                    const end = new Date(dateEnd);
                    return d >= start && d <= end;
                  } else if (dateStart || dateEnd) {
                    return false;
                  } else {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                  }
                };

                const monthSalesData = sales.filter(s => {
                  const saleDate = new Date(s.sale_date || s.created_date);
                  return getFilteredDate(saleDate);
                });

                const data = [];

                // 1. Pagamentos à vista das vendas do mês
                monthSalesData.forEach(sale => {
                  const cashPayments = sale.payment_details?.filter(p => 
                    ['dinheiro', 'pix', 'cartao_debito', 'transferencia', 'boleto'].includes(p.method)
                  ) || [];
                  cashPayments.forEach(p => {
                    data.push({
                      'Tipo': 'Pagamento à Vista',
                      'Venda': sale.sale_number,
                      'Cliente': sale.client_name,
                      'Data': format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy'),
                      'Método': p.method === 'pix' ? 'PIX' :
                                p.method === 'dinheiro' ? 'Dinheiro' :
                                p.method === 'cartao_debito' ? 'Cartão Débito' :
                                p.method === 'transferencia' ? 'Transferência' : 'Boleto',
                      'Valor': p.amount || 0
                    });
                  });
                });

                // 2. Parcelas pagas no período
                const installmentsPaidThisMonth = installments.filter(i => {
                  if (i.payment_status !== 'pago') return false;
                  const paymentDate = new Date(i.last_payment_date || i.created_date);
                  return getFilteredDate(paymentDate);
                });

                installmentsPaidThisMonth.forEach(i => {
                  data.push({
                    'Tipo': 'Parcela Recebida',
                    'Venda': i.sale_number,
                    'Cliente': i.client_name,
                    'Data': format(new Date(i.last_payment_date), 'dd/MM/yyyy'),
                    'Método': i.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão Crédito',
                    'Valor': i.paid_amount || 0
                  });
                });

                exportToExcel(data, 'relatorio_receita_mes');
              }} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Tipo</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const getFilteredDate = (date) => {
                        const d = new Date(date);
                        if (dateStart && dateEnd) {
                          const start = new Date(dateStart);
                          const end = new Date(dateEnd);
                          return d >= start && d <= end;
                        } else if (dateStart || dateEnd) {
                          return false;
                        } else {
                          const currentMonth = new Date().getMonth();
                          const currentYear = new Date().getFullYear();
                          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                        }
                      };

                      const monthSalesData = sales.filter(s => {
                        const saleDate = new Date(s.sale_date || s.created_date);
                        return getFilteredDate(saleDate);
                      });

                      const rows = [];

                      // 1. Pagamentos à vista das vendas do período
                      monthSalesData.forEach(sale => {
                        const cashPayments = sale.payment_details?.filter(p => 
                          ['dinheiro', 'pix', 'cartao_debito', 'transferencia', 'boleto'].includes(p.method)
                        ) || [];
                        cashPayments.forEach((p, idx) => {
                          rows.push(
                            <TableRow key={`sale-${sale.id}-${idx}`}>
                              <TableCell>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                  Pagamento à Vista
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">{sale.sale_number}</TableCell>
                              <TableCell>{sale.client_name}</TableCell>
                              <TableCell>{formatLocalDate(sale.sale_date || sale.created_date)}</TableCell>
                              <TableCell>
                                {p.method === 'pix' ? 'PIX' :
                                 p.method === 'dinheiro' ? 'Dinheiro' :
                                 p.method === 'cartao_debito' ? 'Cartão Débito' :
                                 p.method === 'transferencia' ? 'Transferência' : 'Boleto'}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                {formatCurrency(p.amount)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      });

                      // 2. Parcelas pagas no período
                      const installmentsPaidThisMonth = installments.filter(i => {
                        if (i.payment_status !== 'pago') return false;
                        const paymentDate = new Date(i.last_payment_date || i.created_date);
                        return getFilteredDate(paymentDate);
                      });

                      installmentsPaidThisMonth.forEach(i => {
                        rows.push(
                          <TableRow key={`inst-${i.id}`}>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Parcela Recebida
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{i.sale_number}</TableCell>
                            <TableCell>{i.client_name}</TableCell>
                            <TableCell>{formatLocalDate(i.last_payment_date)}</TableCell>
                            <TableCell>
                              {i.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão Crédito'}
                              {' '}({i.installment_number}x)
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {formatCurrency(i.paid_amount)}
                            </TableCell>
                          </TableRow>
                        );
                      });

                      return rows.length > 0 ? rows : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            Nenhuma receita registrada este mês
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total Receita do Período</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrency((() => {
                      const getFilteredDate = (date) => {
                        const d = new Date(date);
                        if (dateStart && dateEnd) {
                          const start = new Date(dateStart);
                          const end = new Date(dateEnd);
                          return d >= start && d <= end;
                        } else if (dateStart || dateEnd) {
                          return false;
                        } else {
                          const currentMonth = new Date().getMonth();
                          const currentYear = new Date().getFullYear();
                          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                        }
                      };

                      const monthSalesData = sales.filter(s => {
                        const saleDate = new Date(s.sale_date || s.created_date);
                        return getFilteredDate(saleDate);
                      });

                      const cashPaymentsFromSales = monthSalesData.reduce((sum, sale) => {
                        const cashPayments = sale.payment_details?.filter(p => 
                          ['dinheiro', 'pix', 'cartao_debito', 'transferencia', 'boleto'].includes(p.method)
                        ) || [];
                        return sum + cashPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
                      }, 0);

                      const installmentsPaidThisMonth = installments
                        .filter(i => {
                          if (i.payment_status !== 'pago') return false;
                          const paymentDate = new Date(i.last_payment_date || i.created_date);
                          return getFilteredDate(paymentDate);
                        })
                        .reduce((sum, i) => sum + (i.paid_amount || 0), 0);

                      return cashPaymentsFromSales + installmentsPaidThisMonth;
                    })())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDAS */}
        <TabsContent value="sales" className="space-y-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Venda Início</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Venda Fim</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDateStart('');
                    setDateEnd('');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Vendas</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{salesStats.total}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Valor Total</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(salesStats.valorTotal)}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Ticket Médio</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(salesStats.valorMedio)}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Pagas / Pendentes</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">
                {salesStats.pago} / {salesStats.pendente}
              </p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendas Realizadas</CardTitle>
              <Button onClick={exportSalesReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prof. Indicação</TableHead>
                      <TableHead>Prof. Responsável</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales
                      .filter(() => true)
                      .map(sale => {
                        const client = clients.find(c => c.id === sale.client_id);
                        const profIndicacao = professionals.find(p => p.id === client?.referral_professional);
                        const profResponsavel = professionals.find(p => p.id === client?.responsible_professional);
                        
                        return (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.sale_number}</TableCell>
                            <TableCell>{sale.client_name}</TableCell>
                            <TableCell className="text-sm">{profIndicacao?.full_name || '-'}</TableCell>
                            <TableCell className="text-sm">{profResponsavel?.full_name || '-'}</TableCell>
                            <TableCell>{format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>
                              {sale.status === 'pago' ? format(new Date(sale.updated_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(getTotalPayments(sale))}</TableCell>
                            <TableCell className="text-sm">
                              {sale.payment_details && sale.payment_details.length > 0 ? (
                                <div className="space-y-0.5">
                                  {sale.payment_details.map((pd, idx) => (
                                    <div key={idx}>
                                      {pd.method === 'pix' ? 'PIX' : 
                                       pd.method === 'pix_parcelado' ? 'PIX Parcelado' :
                                       pd.method === 'cartao_credito' ? 'Cartão Crédito' :
                                       pd.method === 'cartao_debito' ? 'Cartão Débito' :
                                       pd.method === 'dinheiro' ? 'Dinheiro' :
                                       pd.method === 'boleto' ? 'Boleto' :
                                       pd.method === 'transferencia' ? 'Transferência' : pd.method}
                                      {pd.installments > 1 && ` (${pd.installments}x)`}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>{sale.payment_method} {sale.installments > 1 && `(${sale.installments}x)`}</span>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={sale.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Taxa de Conversão"
              value={`${clients.length > 0 ? ((sales.length / clients.length) * 100).toFixed(1) : 0}%`}
              color="blue"
              icon={TrendingUp}
            />
            <StatCard
              title="Ticket Médio"
              value={formatCurrency(sales.length > 0 ? sales.reduce((sum, s) => sum + getTotalPayments(s), 0) / sales.length : 0)}
              color="green"
              icon={DollarSign}
            />
            <StatCard
              title="Agendamentos"
              value={appointments.length}
              color="purple"
              icon={Calendar}
            />
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Vendas por Marca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const brandSales = {};
                  sales.forEach(sale => {
                    sale.items?.forEach(item => {
                      const brand = item.brand || 'Sem Marca';
                      if (!brandSales[brand]) {
                        brandSales[brand] = { count: 0, revenue: 0 };
                      }
                      brandSales[brand].count += 1;
                      brandSales[brand].revenue += item.unit_price || 0;
                    });
                  });

                  return Object.entries(brandSales)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([brand, data]) => (
                      <div key={brand} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{brand}</p>
                          <p className="text-sm text-slate-500">{data.count} unidades vendidas</p>
                        </div>
                        <p className="font-semibold text-[#1e3a5f]">{formatCurrency(data.revenue)}</p>
                      </div>
                    ));
                })()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Ciclo de Vida dos Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { status: 'lead', label: 'Leads', color: 'bg-blue-100 text-blue-700' },
                  { status: 'em_teste', label: 'Em Teste', color: 'bg-purple-100 text-purple-700' },
                  { status: 'cliente_ativo', label: 'Ativos', color: 'bg-emerald-100 text-emerald-700' },
                  { status: 'pos_venda', label: 'Pós-Venda', color: 'bg-amber-100 text-amber-700' }
                ].map(({ status, label, color }) => {
                  const count = clients.filter(c => c.status === status).length;
                  const percentage = clients.length > 0 ? ((count / clients.length) * 100).toFixed(1) : 0;
                  return (
                    <div key={status} className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-sm text-slate-500 mb-1">{label}</p>
                      <p className="text-2xl font-bold text-slate-800">{count}</p>
                      <p className={`text-xs font-medium mt-1 px-2 py-1 rounded-full inline-block ${color}`}>
                        {percentage}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTAS A RECEBER */}
        <TabsContent value="receivables" className="space-y-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Período Inicial</Label>
                <Input
                  type="date"
                  value={dueDateStart}
                  onChange={(e) => setDueDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período Final</Label>
                <Input
                  type="date"
                  value={dueDateEnd}
                  onChange={(e) => setDueDateEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={paymentDateStart || 'todos'}
                  onValueChange={(value) => {
                    if (value === 'todos') {
                      setPaymentDateStart('');
                      setPaymentDateEnd('');
                    } else {
                      setPaymentDateStart(value);
                      setPaymentDateEnd('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDueDateStart('');
                    setDueDateEnd('');
                    setPaymentDateStart('');
                    setPaymentDateEnd('');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total a Receber</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency((() => {
                  const getCurrentMonthDateRange = () => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    return { start, end };
                  };

                  const filterByDueDate = (inst) => {
                    if (!dueDateStart && !dueDateEnd) {
                      const { start, end } = getCurrentMonthDateRange();
                      const dueDate = new Date(inst.due_date);
                      return dueDate >= start && dueDate <= end;
                    }
                    const dueDate = new Date(inst.due_date);
                    if (dueDateStart && dueDateEnd) {
                      return dueDate >= new Date(dueDateStart) && dueDate <= new Date(dueDateEnd);
                    }
                    return true;
                  };

                  const statusFilter = paymentDateStart;
                  
                  return installments
                    .filter(i => {
                      if (!filterByDueDate(i)) return false;
                      if (statusFilter === 'pago') return i.payment_status === 'pago';
                      if (statusFilter === 'pendente') return i.payment_status !== 'pago';
                      return true;
                    })
                    .filter(i => i.payment_status !== 'pago')
                    .reduce((sum, i) => {
                      const feeRate = i.fee_rate || 0;
                      const isCard = i.payment_method === 'cartao_credito';
                      const netAmount = isCard && feeRate > 0 ? (i.original_amount || 0) * (1 - feeRate / 100) : (i.original_amount || 0);
                      const netRemaining = (i.remaining_amount || 0) * (netAmount / (i.original_amount || 1));
                      return sum + netRemaining;
                    }, 0);
                })())}
              </p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Recebido</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency((() => {
                  const getCurrentMonthDateRange = () => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    return { start, end };
                  };

                  const filterByDueDate = (inst) => {
                    if (!dueDateStart && !dueDateEnd) {
                      const { start, end } = getCurrentMonthDateRange();
                      const dueDate = new Date(inst.due_date);
                      return dueDate >= start && dueDate <= end;
                    }
                    const dueDate = new Date(inst.due_date);
                    if (dueDateStart && dueDateEnd) {
                      return dueDate >= new Date(dueDateStart) && dueDate <= new Date(dueDateEnd);
                    }
                    return true;
                  };

                  const statusFilter = paymentDateStart;

                  return installments
                    .filter(i => {
                      if (!filterByDueDate(i)) return false;
                      if (statusFilter === 'pago') return i.payment_status === 'pago';
                      if (statusFilter === 'pendente') return i.payment_status !== 'pago';
                      return true;
                    })
                    .filter(i => i.payment_status === 'pago')
                    .reduce((sum, i) => {
                      const feeRate = i.fee_rate || 0;
                      const isCard = i.payment_method === 'cartao_credito';
                      const netAmount = isCard && feeRate > 0 ? (i.paid_amount || 0) * (1 - feeRate / 100) : (i.paid_amount || 0);
                      return sum + netAmount;
                    }, 0);
                })())}
              </p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">PIX Parcelado</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {installments.filter(i => i.payment_method === 'pix_parcelado' && i.payment_status !== 'pago').length}
              </p>
              <p className="text-xs text-slate-500">parcelas pendentes</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Cartão Crédito</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {installments.filter(i => i.payment_method === 'cartao_credito' && i.payment_status !== 'pago').length}
              </p>
              <p className="text-xs text-slate-500">parcelas pendentes</p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Parcelas a Receber</CardTitle>
              <Button onClick={() => {
                const data = installments
                  .filter(inst => {
                    const getCurrentMonthDateRange = () => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      return { start, end };
                    };

                    // Filtro de período
                    if (!dueDateStart && !dueDateEnd) {
                      const { start, end } = getCurrentMonthDateRange();
                      const dueDate = new Date(inst.due_date);
                      if (!(dueDate >= start && dueDate <= end)) return false;
                    } else if (dueDateStart || dueDateEnd) {
                      const dueDate = new Date(inst.due_date);
                      if (dueDateStart && dueDate < new Date(dueDateStart)) return false;
                      if (dueDateEnd && dueDate > new Date(dueDateEnd)) return false;
                    }

                    // Filtro de status
                    const statusFilter = paymentDateStart;
                    if (statusFilter === 'pago' && inst.payment_status !== 'pago') return false;
                    if (statusFilter === 'pendente' && inst.payment_status === 'pago') return false;

                    return true;
                  })
                  .map(i => {
                   const feeRate = i.fee_rate || 0;
                   const isCard = i.payment_method === 'cartao_credito';
                   const netAmount = isCard && feeRate > 0 ? (i.original_amount || 0) * (1 - feeRate / 100) : (i.original_amount || 0);
                   return {
                     'Cliente': i.client_name,
                     'Método': i.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão Crédito',
                     'Bandeira': i.card_brand || '',
                     'Parcela': i.installment_number,
                     'Vencimento': format(new Date(i.due_date), 'dd/MM/yyyy'),
                     'Data Pagamento': i.last_payment_date ? format(new Date(i.last_payment_date), 'dd/MM/yyyy') : '-',
                     'Valor Bruto': i.original_amount,
                     'Taxa Cartão (%)': feeRate || '',
                     'Valor Líquido': netAmount,
                     'Valor Pago': i.paid_amount,
                     'Saldo': i.remaining_amount,
                     'Status': i.payment_status === 'pago' ? 'Pago' : i.payment_status === 'atrasado' ? 'Atrasado' : 'Pendente'
                   };
                  });
                exportToExcel(data, 'relatorio_contas_receber');
              }} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método / Bandeira</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Valor Bruto</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments
                      .filter(inst => {
                        const getCurrentMonthDateRange = () => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), now.getMonth(), 1);
                          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          return { start, end };
                        };

                        // Filtro de período
                        if (!dueDateStart && !dueDateEnd) {
                          const { start, end } = getCurrentMonthDateRange();
                          const dueDate = new Date(inst.due_date);
                          if (!(dueDate >= start && dueDate <= end)) return false;
                        } else if (dueDateStart || dueDateEnd) {
                          const dueDate = new Date(inst.due_date);
                          if (dueDateStart && dueDate < new Date(dueDateStart)) return false;
                          if (dueDateEnd && dueDate > new Date(dueDateEnd)) return false;
                        }

                        // Filtro de status
                        const statusFilter = paymentDateStart;
                        if (statusFilter === 'pago' && inst.payment_status !== 'pago') return false;
                        if (statusFilter === 'pendente' && inst.payment_status === 'pago') return false;

                        return true;
                      })
                      .map(inst => (
                        <TableRow key={inst.id}>
                         <TableCell className="font-medium">{inst.client_name}</TableCell>
                         <TableCell>
                           {inst.payment_method === 'pix_parcelado' ? 'PIX Parcelado' : 'Cartão Crédito'}
                           {inst.card_brand && <span className="ml-1 text-xs text-slate-500">({inst.card_brand})</span>}
                         </TableCell>
                         <TableCell>{inst.installment_number}</TableCell>
                         <TableCell>{formatLocalDate(inst.due_date)}</TableCell>
                         <TableCell>{inst.last_payment_date ? formatLocalDate(inst.last_payment_date) : '-'}</TableCell>
                         <TableCell className="text-right">{formatCurrency(inst.original_amount)}</TableCell>
                         <TableCell className="text-right text-amber-600">
                           {inst.fee_rate > 0 ? `${inst.fee_rate}%` : '—'}
                         </TableCell>
                         <TableCell className="text-right font-semibold text-emerald-700">
                           {formatCurrency(inst.fee_rate > 0 && inst.payment_method === 'cartao_credito'
                             ? (inst.original_amount || 0) * (1 - (inst.fee_rate || 0) / 100)
                             : inst.original_amount)}
                         </TableCell>
                         <TableCell className="text-right">{formatCurrency(inst.paid_amount)}</TableCell>
                         <TableCell className="text-right font-medium">{formatCurrency(inst.remaining_amount)}</TableCell>
                         <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              inst.payment_status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 
                              inst.payment_status === 'atrasado' ? 'bg-red-100 text-red-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {inst.payment_status === 'pago' ? 'Pago' : inst.payment_status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTAS A PAGAR */}
        <TabsContent value="payables" className="space-y-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Período Inicial</Label>
                <Input
                  type="date"
                  value={dueDateStart}
                  onChange={(e) => setDueDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período Final</Label>
                <Input
                  type="date"
                  value={dueDateEnd}
                  onChange={(e) => setDueDateEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={paymentDateStart || 'todos'}
                  onValueChange={(value) => {
                    if (value === 'todos') {
                      setPaymentDateStart('');
                      setPaymentDateEnd('');
                    } else {
                      setPaymentDateStart(value);
                      setPaymentDateEnd('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="a_pagar">A Pagar</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDueDateStart('');
                    setDueDateEnd('');
                    setPaymentDateStart('');
                    setPaymentDateEnd('');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">A Pagar</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(expenses.filter(e => e.status !== 'pago').reduce((sum, e) => sum + (e.amount || 0), 0))}
              </p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Pago</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(expenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + (e.amount || 0), 0))}
              </p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Atrasado</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(expenses.filter(e => {
                  if (e.status === 'pago') return false;
                  const dueDate = new Date(e.due_date);
                  return dueDate < new Date();
                }).reduce((sum, e) => sum + (e.amount || 0), 0))}
              </p>
            </Card>
            <Card className="p-4 border-0 shadow-sm">
              <p className="text-sm text-slate-500">Total Despesas</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {expenses.length}
              </p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Despesas Cadastradas</CardTitle>
              <Button onClick={() => {
                const data = expenses
                  .filter(exp => {
                    const getCurrentMonthDateRange = () => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      return { start, end };
                    };

                    // Filtro de período
                    if (!dueDateStart && !dueDateEnd) {
                      const { start, end } = getCurrentMonthDateRange();
                      const dueDate = new Date(exp.due_date);
                      if (!(dueDate >= start && dueDate <= end)) return false;
                    } else if (dueDateStart || dueDateEnd) {
                      const dueDate = new Date(exp.due_date);
                      if (dueDateStart && dueDate < new Date(dueDateStart)) return false;
                      if (dueDateEnd && dueDate > new Date(dueDateEnd)) return false;
                    }

                    // Filtro de status
                    const statusFilter = paymentDateStart;
                    const today = new Date();
                    const dueDate = new Date(exp.due_date);
                    const actualStatus = exp.status === 'pago' ? 'pago' : (dueDate < today ? 'atrasado' : 'a_pagar');

                    if (statusFilter === 'pago' && actualStatus !== 'pago') return false;
                    if (statusFilter === 'a_pagar' && actualStatus !== 'a_pagar') return false;
                    if (statusFilter === 'atrasado' && actualStatus !== 'atrasado') return false;

                    return true;
                  })
                  .map(e => ({
                    'Categoria': e.category_name,
                    'Fornecedor': e.counterparty_name || '',
                    'Vencimento': format(new Date(e.due_date), 'dd/MM/yyyy'),
                    'Data Pagamento': e.payment_date ? format(new Date(e.payment_date), 'dd/MM/yyyy') : '-',
                    'Valor': e.amount,
                    'Método': e.payment_method,
                    'Parcela': e.installment_number ? `${e.installment_number}/${e.installments}` : '-',
                    'Status': e.status === 'pago' ? 'Pago' : 'A Pagar'
                  }));
                exportToExcel(data, 'relatorio_contas_pagar');
              }} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses
                      .filter(exp => {
                        const getCurrentMonthDateRange = () => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), now.getMonth(), 1);
                          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          return { start, end };
                        };

                        // Filtro de período
                        if (!dueDateStart && !dueDateEnd) {
                          const { start, end } = getCurrentMonthDateRange();
                          const dueDate = new Date(exp.due_date);
                          if (!(dueDate >= start && dueDate <= end)) return false;
                        } else if (dueDateStart || dueDateEnd) {
                          const dueDate = new Date(exp.due_date);
                          if (dueDateStart && dueDate < new Date(dueDateStart)) return false;
                          if (dueDateEnd && dueDate > new Date(dueDateEnd)) return false;
                        }

                        // Filtro de status
                        const statusFilter = paymentDateStart;
                        const today = new Date();
                        const dueDate = new Date(exp.due_date);
                        const actualStatus = exp.status === 'pago' ? 'pago' : (dueDate < today ? 'atrasado' : 'a_pagar');

                        if (statusFilter === 'pago' && actualStatus !== 'pago') return false;
                        if (statusFilter === 'a_pagar' && actualStatus !== 'a_pagar') return false;
                        if (statusFilter === 'atrasado' && actualStatus !== 'atrasado') return false;

                        return true;
                      })
                      .map(exp => {
                        const today = new Date();
                        const dueDate = new Date(exp.due_date);
                        const status = exp.status === 'pago' ? 'pago' : (dueDate < today ? 'atrasado' : 'a_pagar');
                        
                        return (
                          <TableRow key={exp.id}>
                            <TableCell className="font-medium">{exp.category_name}</TableCell>
                            <TableCell>{exp.counterparty_name || '-'}</TableCell>
                            <TableCell>{formatLocalDate(exp.due_date)}</TableCell>
                            <TableCell>
                              {exp.payment_date ? formatLocalDate(exp.payment_date) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(exp.amount)}</TableCell>
                            <TableCell className="capitalize">{exp.payment_method?.replace('_', ' ')}</TableCell>
                            <TableCell>
                              {exp.installment_number ? `${exp.installment_number}/${exp.installments}` : '-'}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 
                                status === 'atrasado' ? 'bg-red-100 text-red-700' : 
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atrasado' : 'A Pagar'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPASSE INDICAÇÃO */}
        <TabsContent value="referral" className="space-y-6">
          <Card className="p-4 border-0 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDateStart('');
                    setDateEnd('');
                  }}
                >
                  Limpar Filtro
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Repasse de Indicação (10%)</CardTitle>
              <Button onClick={exportReferralReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Profissional</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data Venda</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Repasse 10%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => {
                      if (!sale.test_referral_id) return null;
                      
                      const prof = professionals.find(p => p.id === sale.test_referral_id);
                      if (!prof) return null;
                      
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{prof.full_name}</TableCell>
                          <TableCell className="capitalize">{prof.specialty}</TableCell>
                          <TableCell>{sale.client_name}</TableCell>
                          <TableCell>{format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(getTotalPayments(sale))}</TableCell>
                          <TableCell className="text-right font-bold text-[#A4D233]">
                            {formatCurrency(getTotalPayments(sale) * 0.10)}
                          </TableCell>
                        </TableRow>
                      );
                    }).filter(Boolean)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}