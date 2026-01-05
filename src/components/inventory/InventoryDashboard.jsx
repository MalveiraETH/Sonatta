import React from 'react';
import { Card } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, ShoppingCart, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function InventoryDashboard({ products, sales }) {
  // Produtos Serializados
  const serializedProducts = products.filter(p => p.stock_type === 'serializado');
  const serializedAvailable = serializedProducts.filter(p => p.status === 'disponivel').length;
  const serializedSold = serializedProducts.filter(p => p.status === 'vendido').length;
  const serializedReserved = serializedProducts.filter(p => p.status === 'reservado').length;

  // Produtos Não Serializados
  const nonSerializedProducts = products.filter(p => p.stock_type === 'nao_serializado');
  const totalNonSerializedQty = nonSerializedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockProducts = nonSerializedProducts.filter(p => p.quantity <= p.min_stock).length;

  // Valor total em estoque
  const totalValue = products.reduce((sum, p) => {
    if (p.stock_type === 'serializado' && p.status === 'disponivel') {
      return sum + (p.cost_price || 0);
    } else if (p.stock_type === 'nao_serializado') {
      return sum + ((p.quantity || 0) * (p.cost_price || 0));
    }
    return sum;
  }, 0);

  // Gráfico de produtos por categoria
  const categoryData = products.reduce((acc, p) => {
    const cat = p.category || 'outros';
    if (!acc[cat]) acc[cat] = 0;
    if (p.stock_type === 'serializado') {
      acc[cat] += 1;
    } else {
      acc[cat] += p.quantity || 0;
    }
    return acc;
  }, {});

  const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6B3FA0', '#A4D233', '#1e3a5f', '#834CB8', '#B8E047', '#2d5a8a'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-[#6B3FA0]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Produtos Únicos</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{serializedProducts.length}</p>
              <p className="text-xs text-emerald-600">{serializedAvailable} disponíveis</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#A4D233]/10 flex items-center justify-center flex-shrink-0">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-[#A4D233]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Estoque (Qtd)</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{totalNonSerializedQty}</p>
              <p className="text-xs text-slate-500">{nonSerializedProducts.length} tipos</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Alertas</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{lowStockProducts}</p>
              <p className="text-xs text-slate-500">produtos baixos</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-0 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Valor</p>
              <p className="text-base sm:text-xl font-bold text-slate-800 truncate max-w-[120px]">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-slate-500">custo total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">
            Distribuição por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">
            Status - Produtos Serializados
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-emerald-900">Disponíveis</p>
                  <p className="text-xs text-emerald-600">Prontos para venda</p>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{serializedAvailable}</p>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-amber-900">Reservados</p>
                  <p className="text-xs text-amber-600">Em processo</p>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{serializedReserved}</p>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">Vendidos</p>
                  <p className="text-xs text-slate-600">Fora do estoque</p>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-600">{serializedSold}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}