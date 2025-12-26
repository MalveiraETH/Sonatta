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
import { FileText, Download, Package, Users, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, clientsData, salesData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Client.list(),
        base44.entities.Sale.list('-created_date')
      ]);
      setProducts(productsData);
      setClients(clientsData);
      setSales(salesData);
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

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filterSalesByDate = () => {
    if (!dateStart || !dateEnd) return sales;
    return sales.filter(sale => {
      const saleDate = new Date(sale.created_date);
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
      'Custo': p.cost_price || 0,
      'Venda': p.sale_price || 0,
      'NF Entrada': p.nota_fiscal_entrada || '',
      'Data Entrada': p.entry_date || ''
    }));
    exportToCSV(data, 'relatorio_estoque');
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
    exportToCSV(data, 'relatorio_clientes');
  };

  const exportSalesReport = () => {
    const data = filteredSales.map(s => ({
      'Número': s.sale_number,
      'Cliente': s.client_name,
      'Valor': s.total,
      'Pagamento': s.payment_method,
      'Parcelas': s.installments,
      'Status': s.status,
      'NF': s.nota_fiscal || '',
      'Data': format(new Date(s.created_date), 'dd/MM/yyyy')
    }));
    exportToCSV(data, 'relatorio_vendas');
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
        <TabsList>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
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
                      <TableHead className="text-right">Valor Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.brand} {product.model}</TableCell>
                        <TableCell className="text-sm text-slate-600">{product.serial_number}</TableCell>
                        <TableCell><StatusBadge status={product.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
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
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.sale_number}</TableCell>
                        <TableCell>{sale.client_name}</TableCell>
                        <TableCell>{format(new Date(sale.created_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                        <TableCell className="text-sm">
                          {sale.payment_method} {sale.installments > 1 && `(${sale.installments}x)`}
                        </TableCell>
                        <TableCell><StatusBadge status={sale.status} /></TableCell>
                      </TableRow>
                    ))}
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