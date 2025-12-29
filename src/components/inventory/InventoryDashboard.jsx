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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#6B3FA0]/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-[#6B3FA0]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Produtos Únicos</p>
              <p className="text-2xl font-bold text-slate-800">{serializedProducts.length}</p>
              <p className="text-xs text-emerald-600">{serializedAvailable} disponíveis</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#A4D233]/10 flex items-center justify-center">
              <Layers className="h-6 w-6 text-[#A4D233]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Estoque Total (Qtd)</p>
              <p className="text-2xl font-bold text-slate-800">{totalNonSerializedQty}</p>
              <p className="text-xs text-slate-500">{nonSerializedProducts.length} tipos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Alertas de Estoque</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockProducts}</p>
              <p className="text-xs text-slate-500">produtos baixos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Valor em Estoque</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-slate-500">custo total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-0 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Distribuição por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={250}>
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

        <Card className="p-6 border-0 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Status - Produtos Serializados
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">Disponíveis</p>
                  <p className="text-xs text-emerald-600">Prontos para venda</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{serializedAvailable}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Reservados</p>
                  <p className="text-xs text-amber-600">Em processo</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{serializedReserved}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Vendidos</p>
                  <p className="text-xs text-slate-600">Fora do estoque</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-600">{serializedSold}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}