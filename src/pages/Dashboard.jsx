import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Ear,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clients, appointments, sales, products, installments, expenses, tests] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Appointment.list('-created_date'),
        base44.entities.Sale.list('-created_date', 100),
        base44.entities.Product.list(),
        base44.entities.Installment.list(),
        base44.entities.Expense.list(),
        base44.entities.Test.list()
      ]);

      const today = format(new Date(), 'yyyy-MM-dd');
      const todayDate = new Date();
      const currentMonth = todayDate.getMonth();
      const currentYear = todayDate.getFullYear();

      // Filtros
      const overduePixInstallments = installments.filter(inst => {
        const dueDate = new Date(inst.due_date);
        return inst.payment_method === 'pix_parcelado' && inst.payment_status !== 'pago' && dueDate < todayDate;
      });

      const overdueCardInstallments = installments.filter(inst => {
        const dueDate = new Date(inst.due_date);
        return inst.payment_method === 'cartao_credito' && inst.payment_status !== 'pago' && dueDate < todayDate;
      });

      const monthSalesData = sales.filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      });

      // Receita total do mês = vendas do mês + contas a receber pagas no mês
      const totalMonthRevenue = monthSalesData.reduce((sum, s) => sum + (s.total || 0), 0) +
        installments
          .filter(i => {
            if (i.payment_status !== 'pago') return false;
            const paymentDate = new Date(i.last_payment_date || i.created_date);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
          })
          .reduce((sum, i) => sum + (i.paid_amount || 0), 0);

      const monthExpenses = expenses
        .filter(e => {
          const dueDate = new Date(e.due_date);
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const monthResult = totalMonthRevenue - monthExpenses;

      const lowStock = products.filter(p => 
        (p.stock_type === 'nao_serializado' && p.quantity <= (p.min_stock || 5) && p.quantity > 0) ||
        (p.stock_type === 'serializado' && p.status === 'disponivel' && p.quantity <= 1)
      );

      const todayAppts = appointments.filter(a => a.date === today);

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'cliente_ativo').length,
        todayAppointments: todayAppts.length,
        monthSales: monthSalesData.length,
        totalMonthRevenue,
        monthExpenses,
        monthResult,
        lowStockProducts: lowStock.length,
        overduePixCount: overduePixInstallments.length,
        overduePixAmount: overduePixInstallments.reduce((sum, inst) => sum + (inst.remaining_amount || 0), 0),
        overdueCardCount: overdueCardInstallments.length,
        overdueCardAmount: overdueCardInstallments.reduce((sum, inst) => sum + (inst.remaining_amount || 0), 0),
        testsActive: tests.filter(t => t.status === 'em_teste' || t.status === 'teste_estendido').length
      });

      setTodayAppointments(todayAppts.slice(0, 5));
      setRecentSales(sales.slice(0, 5));
      setLowStockProducts(lowStock.slice(0, 5));
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link to={createPageUrl('AccountsReceivable')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Receita do Mês</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalMonthRevenue)}</p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('AccountsPayable')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Contas a Pagar</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats.monthExpenses)}</p>
              </div>
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 opacity-60" />
            </div>
          </Card>
        </Link>

        <Card className={`p-4 ${(stats.monthResult || 0) >= 0 ? '' : 'bg-red-50/50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-1">Resultado</p>
              <p className={`text-lg sm:text-2xl font-bold ${(stats.monthResult || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(stats.monthResult)}
              </p>
            </div>
            <TrendingUp className={`h-5 w-5 sm:h-6 sm:w-6 opacity-60 ${(stats.monthResult || 0) >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          </div>
        </Card>

        <Link to={createPageUrl('Sales')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Vendas do Mês</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.monthSales || 0}</p>
              </div>
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 opacity-60" />
            </div>
          </Card>
        </Link>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link to={createPageUrl('Clients')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Total Clientes</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.totalClients || 0}</p>
              </div>
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 opacity-60" />
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('Tests')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Em Teste</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.testsActive || 0}</p>
              </div>
              <Ear className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 opacity-60" />
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('Appointments')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Agendamentos Hoje</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.todayAppointments || 0}</p>
              </div>
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 opacity-60" />
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('Clients')} state={{ filter: 'cliente_ativo' }}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">Clientes Ativos</p>
                <p className="text-lg sm:text-2xl font-bold text-[#6B3FA0]">{stats.activeClients || 0}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-[#6B3FA0] opacity-60" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Alertas Críticos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link to={createPageUrl('AccountsReceivable')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-slate-600">PIX Atrasado</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.overduePixAmount)}</p>
                <p className="text-xs text-slate-500">{stats.overduePixCount} parcelas</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('AccountsReceivable')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-slate-600">Cartão Atrasado</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.overdueCardAmount)}</p>
                <p className="text-xs text-slate-500">{stats.overdueCardCount} parcelas</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to={createPageUrl('Inventory')}>
          <Card className="p-4 cursor-pointer transition-all hover:shadow-md border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-600">Estoque Baixo</p>
                <p className="text-xl font-bold text-blue-600">{stats.lowStockProducts || 0}</p>
                <p className="text-xs text-slate-500">produtos</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Listas Operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agendamentos Hoje */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Agendamentos Hoje</span>
              <Clock className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{appt.client_name}</p>
                      <p className="text-sm text-slate-500">{appt.time} • {appt.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appt.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                      appt.status === 'realizado' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
                <Link to={createPageUrl('Appointments')}>
                  <p className="text-sm text-[#6B3FA0] hover:underline text-center pt-2">Ver todos →</p>
                </Link>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhum agendamento para hoje</p>
            )}
          </CardContent>
        </Card>

        {/* Vendas Recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Vendas Recentes</span>
              <ShoppingCart className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{sale.client_name}</p>
                      <p className="text-sm text-slate-500">{sale.sale_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{formatCurrency(sale.total)}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sale.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))}
                <Link to={createPageUrl('Sales')}>
                  <p className="text-sm text-[#6B3FA0] hover:underline text-center pt-2">Ver todas →</p>
                </Link>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma venda registrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}