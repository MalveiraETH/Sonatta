import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FinancialChart({ sales, expenses }) {
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(new Date().getFullYear(), i, 1);
    const monthName = month.toLocaleDateString('pt-BR', { month: 'short' });
    
    const monthSales = sales
      .filter(s => new Date(s.sale_date || s.created_date).getMonth() === i)
      .reduce((sum, s) => sum + (s.total_net_amount || s.total || 0), 0);
    
    const monthExpenses = expenses
      .filter(e => new Date(e.due_date).getMonth() === i)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      month: monthName,
      receitas: monthSales,
      despesas: monthExpenses,
      resultado: monthSales - monthExpenses,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo Financeiro Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="receitas" fill="#10B981" name="Receitas" />
            <Bar dataKey="despesas" fill="#EF4444" name="Despesas" />
            <Bar dataKey="resultado" fill="#3B82F6" name="Resultado" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}