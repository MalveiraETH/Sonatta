import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import WarrantyAlerts from '@/components/dashboard/WarrantyAlerts';
import {
  Users,
  Calendar,
  ShoppingCart,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Ear
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    todayAppointments: 0,
    monthSales: 0,
    monthRevenue: 0,
    lowStockProducts: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clients, appointments, sales, products] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Appointment.list(),
        base44.entities.Sale.list('-created_date', 100),
        base44.entities.Product.list()
      ]);

      const today = format(new Date(), 'yyyy-MM-dd');
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Stats
      const activeClients = clients.filter(c => c.status === 'cliente_ativo').length;
      const todayAppts = appointments.filter(a => a.date === today);
      const monthSalesData = sales.filter(s => {
        const saleDate = new Date(s.created_date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      });
      const monthRevenue = monthSalesData.reduce((sum, s) => sum + (s.total || 0), 0);
      const lowStock = products.filter(p => p.quantity <= (p.min_stock || 5) && p.quantity > 0);

      setStats({
        totalClients: clients.length,
        activeClients,
        todayAppointments: todayAppts.length,
        monthSales: monthSalesData.length,
        monthRevenue,
        lowStockProducts: lowStock.length
      });

      setTodayAppointments(todayAppts.slice(0, 5));
      setRecentSales(sales.slice(0, 5));
      setLowStockProducts(lowStock.slice(0, 5));

      // Sales by category
      const categoryMap = {};
      sales.forEach(sale => {
        sale.items?.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const category = product?.category || 'outros';
          categoryMap[category] = (categoryMap[category] || 0) + (item.total || 0);
        });
      });

      const categoryLabels = {
        aparelho_auditivo: 'Aparelhos',
        acessorio: 'Acessórios',
        molde: 'Moldes',
        bateria: 'Baterias',
        outros: 'Outros'
      };

      setSalesByCategory(
        Object.entries(categoryMap).map(([key, value]) => ({
          name: categoryLabels[key] || key,
          value
        }))
      );

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

  const COLORS = ['#1e3a5f', '#c9a227', '#3b82f6', '#10b981', '#8b5cf6'];

  const typeLabels = {
    avaliacao: 'Avaliação',
    teste: 'Teste',
    ajuste: 'Ajuste',
    manutencao: 'Manutenção',
    retorno: 'Retorno'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#c9a227]/10 flex items-center justify-center">
            <Ear className="h-6 w-6 text-[#c9a227]" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Sonatta</p>
            <p className="text-xs text-slate-500">Soluções Auditivas</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clientes Ativos"
          value={stats.activeClients}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Agendamentos Hoje"
          value={stats.todayAppointments}
          icon={Calendar}
          color="gold"
        />
        <StatCard
          title="Vendas do Mês"
          value={stats.monthSales}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(stats.monthRevenue)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warranty Alerts */}
        <div className="lg:col-span-2">
          <WarrantyAlerts />
        </div>

        {/* Today's Appointments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Agendamentos de Hoje</CardTitle>
            <Link to={createPageUrl('Appointments')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-[#1e3a5f]" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{appt.client_name}</p>
                        <p className="text-sm text-slate-500">
                          {appt.time} - {typeLabels[appt.type]}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                Nenhum agendamento para hoje
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByCategory.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                Nenhuma venda registrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Vendas Recentes</CardTitle>
            <Link to={createPageUrl('Sales')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{sale.client_name}</p>
                        <p className="text-sm text-slate-500">{sale.sale_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{formatCurrency(sale.total)}</p>
                      <StatusBadge status={sale.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                Nenhuma venda registrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Estoque Baixo
            </CardTitle>
            <Link to={createPageUrl('Inventory')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                Ver estoque <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.brand} {product.model}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-600">{product.quantity} un.</p>
                      <p className="text-xs text-slate-500">Mín: {product.min_stock || 5}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                Todos os produtos com estoque adequado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}