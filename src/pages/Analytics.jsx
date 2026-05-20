import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Users, ShoppingCart, LogOut } from 'lucide-react';

export default function Analytics() {
  const [period, setPeriod] = useState('month');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const clients = await base44.entities.Client.list();
      const sales = await base44.entities.Sale.list();
      const appointments = await base44.entities.Appointment.list();

      // Calcular métricas
      const conversionRate = (sales.length / clients.length * 100).toFixed(2);
      const churnRate = calculateChurn(clients, sales);
      const avgSaleValue = (sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length).toFixed(2);

      // Dados históricos
      const chartData = generateChartData(sales, period);

      setMetrics({
        totalClients: clients.length,
        totalSales: sales.length,
        conversionRate,
        churnRate,
        avgSaleValue,
        activeUsers: clients.filter(c => c.status === 'cliente_ativo').length,
        chartData
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateChurn = (clients, sales) => {
    const inactiveDays = 90;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - inactiveDays);

    const inactive = clients.filter(c => {
      const lastSale = sales
        .filter(s => s.client_id === c.id)
        .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))[0];

      return !lastSale || new Date(lastSale.sale_date) < threshold;
    });

    return ((inactive.length / clients.length) * 100).toFixed(2);
  };

  const generateChartData = (sales, period) => {
    const data = {};
    const now = new Date();

    sales.forEach(sale => {
      if (!sale.sale_date) return;
      const date = new Date(sale.sale_date);
      let key;

      if (period === 'week') {
        const week = Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000));
        key = `Semana ${week}`;
      } else if (period === 'month') {
        key = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      } else {
        key = date.toLocaleString('pt-BR', { month: 'short' });
      }

      if (!data[key]) data[key] = { name: key, value: 0, count: 0 };
      data[key].value += sale.total || 0;
      data[key].count += 1;
    });

    return Object.values(data).reverse();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  if (!metrics) {
    return <div className="text-center text-gray-500">Sem dados disponíveis</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última Semana</SelectItem>
            <SelectItem value="month">Último Mês</SelectItem>
            <SelectItem value="quarter">Último Trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clientes Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-gray-500 mt-1">Todos os clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.totalSales} vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.churnRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 90 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {parseFloat(metrics.avgSaleValue).toLocaleString('pt-BR')}</div>
            <p className="text-xs text-gray-500 mt-1">Por venda</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume de vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Volume de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeUsers}</div>
              <p className="text-sm text-gray-600">Ativos</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{(metrics.totalClients - metrics.activeUsers) * 0.4 | 0}</div>
              <p className="text-sm text-gray-600">Leads</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{(metrics.totalClients - metrics.activeUsers) * 0.6 | 0}</div>
              <p className="text-sm text-gray-600">Pós-Venda</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}