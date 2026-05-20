import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalesChart({ data }) {
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(new Date().getFullYear(), i, 1);
    const monthName = month.toLocaleDateString('pt-BR', { month: 'short' });
    const sales = data.filter(s => {
      const saleDate = new Date(s.sale_date || s.created_date);
      return saleDate.getMonth() === i;
    });
    return {
      month: monthName,
      vendas: sales.length,
      faturamento: sales.reduce((sum, s) => sum + (s.total || 0), 0),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento e Vendas por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="vendas" stroke="#8B5CF6" name="Nº Vendas" />
            <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="#10B981" name="Faturamento (R$)" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}