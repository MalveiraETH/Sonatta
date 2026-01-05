import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, clientsData, salesData, professionalsData, appointmentsData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Client.list(),
        base44.entities.Sale.list('-created_date'),
        base44.entities.Professional.list(),
        base44.entities.Appointment.list()
      ]);
      setProducts(productsData);
      setClients(clientsData);
      setSales(salesData);
      setProfessionals(professionalsData);
      setAppointments(appointmentsData);
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
    valorTotal: filteredSales.reduce((sum, s) => sum + (s.total || 0), 0),
    valorMedio: filteredSales.length > 0 ? filteredSales.reduce((sum, s) => sum + (s.total || 0), 0) / filteredSales.length : 0,
    pago: filteredSales.filter(s => s.status === 'pago').length,
    pendente: filteredSales.filter(s => s.status === 'pendente').length
  };

  const exportStockReport = () => {
    const data = products.map(p => ({
      'Nome': p.name,
      'Categoria': p.category,
      'Marca': p.brand || '',
      'Modelo': p.model || '',
      'Serial': p.serial_number || '',
      'Status': p.status,
      'Custo do Produto': p.cost_price || 0,
      'Venda': p.sale_price || 0,
      'NF de Entrada': p.nota_fiscal_entrada || '',
      'Data Entrada': p.entry_date || ''
    }));
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
    const data = filteredSales.map(s => {
      const client = clients.find(c => c.id === s.client_id);
      const profIndicacao = professionals.find(p => p.id === client?.referral_professional);
      const profResponsavel = professionals.find(p => p.id === client?.responsible_professional);
      
      return {
        'Número': s.sale_number,
        'Cliente': s.client_name,
        'Prof. Indicação': profIndicacao?.full_name || '',
        'Prof. Responsável': profResponsavel?.full_name || '',
        'Valor': s.total,
        'Pagamento': s.payment_method,
        'Parcelas': s.installments,
        'Status': s.status,
        'NF': s.nota_fiscal || '',
        'Data': format(new Date(s.sale_date || s.created_date), 'dd/MM/yyyy')
      };
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
          <TabsTrigger value="sales">Vendas</TabsTrigger>
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
                      <TableHead>NF de Entrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.brand} {product.model}</TableCell>
                        <TableCell className="text-sm text-slate-600">{product.serial_number}</TableCell>
                        <TableCell><StatusBadge status={product.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{product.nota_fiscal_entrada || '-'}</TableCell>
                      </TableRow>
                    ))}
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
                        <TableCell>{format(new Date(client.created_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDAS */}
        <TabsContent value="sales" className="space-y-6">
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
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => {
                      const client = clients.find(c => c.id === sale.client_id);
                      const profIndicacao = professionals.find(p => p.id === client?.referral_professional);
                      const profResponsavel = professionals.find(p => p.id === client?.responsible_professional);
                      
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.sale_number}</TableCell>
                          <TableCell>{sale.client_name}</TableCell>
                          <TableCell className="text-sm">{profIndicacao?.full_name || '-'}</TableCell>
                          <TableCell className="text-sm">{profResponsavel?.full_name || '-'}</TableCell>
                          <TableCell>{format(new Date(sale.created_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                          <TableCell className="text-sm">
                            {sale.payment_method} {sale.installments > 1 && `(${sale.installments}x)`}
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
              value={formatCurrency(sales.length > 0 ? sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length : 0)}
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
                          <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                          <TableCell className="text-right font-bold text-[#A4D233]">
                            {formatCurrency(sale.total * 0.10)}
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