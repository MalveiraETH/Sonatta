import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WarrantyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarrantyAlerts();
  }, []);

  const calculateWarrantyEnd = (saleDate, years = 2) => {
    const date = new Date(saleDate);
    date.setFullYear(date.getFullYear() + years);
    return date;
  };

  const loadWarrantyAlerts = async () => {
    try {
      const sales = await base44.entities.Sale.list('-created_date', 100);
      const clients = await base44.entities.Client.list();
      
      const warningList = [];
      const now = new Date();

      for (const sale of sales) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.serial_number) {
              const warrantyEnd = calculateWarrantyEnd(sale.created_date, 2);
              const daysRemaining = Math.ceil((warrantyEnd - now) / (1000 * 60 * 60 * 24));
              
              // Alertar se faltam 60 dias ou menos
              if (daysRemaining > 0 && daysRemaining <= 60) {
                const client = clients.find(c => c.id === sale.client_id);
                warningList.push({
                  client_name: sale.client_name || client?.full_name,
                  client_phone: sale.client_phone || client?.phone,
                  product_name: item.product_name,
                  serial_number: item.serial_number,
                  warranty_end: warrantyEnd,
                  days_remaining: daysRemaining
                });
              }
            }
          }
        }
      }

      // Ordenar por dias restantes
      warningList.sort((a, b) => a.days_remaining - b.days_remaining);
      setAlerts(warningList.slice(0, 5)); // Top 5 alertas
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Alertas de Garantia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-slate-100 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-600" />
            Alertas de Garantia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhuma garantia próxima do vencimento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          Alertas de Garantia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, idx) => (
          <Alert key={idx} className={`border-l-4 ${alert.days_remaining <= 30 ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'}`}>
            <AlertTriangle className={`h-4 w-4 ${alert.days_remaining <= 30 ? 'text-red-600' : 'text-amber-600'}`} />
            <AlertDescription>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-slate-800">{alert.client_name}</p>
                <p className="text-sm text-slate-600">
                  {alert.product_name} ({alert.serial_number})
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">
                    Garantia expira: {format(alert.warranty_end, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <span className={`text-xs font-semibold ${alert.days_remaining <= 30 ? 'text-red-600' : 'text-amber-600'}`}>
                    {alert.days_remaining} dias restantes
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}