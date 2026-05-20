import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientsChart({ clients }) {
  const statusData = [
    { name: 'Leads', value: clients.filter(c => c.status === 'lead').length, color: '#3B82F6' },
    { name: 'Clientes Ativos', value: clients.filter(c => c.status === 'cliente_ativo').length, color: '#10B981' },
    { name: 'Pós-venda', value: clients.filter(c => c.status === 'pos_venda').length, color: '#F59E0B' },
  ];

  const total = statusData.reduce((sum, item) => sum + item.value, 0);
  const conversionRate = total > 0 
    ? ((statusData[1].value / total) * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Clientes</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Taxa de conversão: <strong>{conversionRate}%</strong>
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}