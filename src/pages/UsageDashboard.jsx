import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function UsageDashboard() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!tenantLoading && tenantId) loadUsage();
  }, [tenantLoading, tenantId]);

  const loadUsage = async () => {
    try {
      const res = await base44.functions.invoke('getTenantUsage', {});
      setUsage(res.data);
    } catch (e) {
      toast.error('Erro ao carregar uso');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await base44.functions.invoke('exportTenantData', { format });
      
      // Cria link de download
      const blob = new Blob([res.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Dados exportados em ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Erro ao exportar ${format}`);
    } finally {
      setExporting(null);
    }
  };

  if (loading || tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  if (!usage) return null;

  const UsageCard = ({ title, used, limit, percentage, icon: Icon }) => {
    const isWarning = percentage >= 80;
    const isCritical = percentage >= 100;
    
    return (
      <Card className={isCritical ? 'border-red-500 bg-red-50' : isWarning ? 'border-yellow-500 bg-yellow-50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className={`h-5 w-5 ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-[#6B3FA0]'}`} />}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold">
            {used}/{limit || '∞'}
          </div>
          {limit && (
            <>
              <Progress value={Math.min(percentage, 100)} className="h-2" />
              <p className={`text-xs ${isCritical ? 'text-red-600 font-semibold' : isWarning ? 'text-yellow-600' : 'text-slate-600'}`}>
                {percentage}% utilizado {isCritical && '- Limite atingido!'}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Uso de Recursos</h1>
        <p className="text-slate-600 mt-2">Plano: <span className="font-semibold capitalize text-[#6B3FA0]">{usage.plan}</span></p>
      </div>

      {/* Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UsageCard
          title="Usuários"
          used={usage.usage.users}
          limit={usage.limits.users}
          percentage={usage.percentages.users}
        />
        <UsageCard
          title="Clientes"
          used={usage.usage.clients}
          limit={usage.limits.clients}
          percentage={usage.percentages.clients}
        />
        <UsageCard
          title="Armazenamento"
          used={usage.usage.storage_gb.toFixed(2)}
          limit={usage.limits.storage_gb}
          percentage={usage.percentages.storage}
        />
      </div>

      {/* Upgrade Suggestion */}
      {usage.plan === 'gratuito' && Object.values(usage.percentages).some(p => p >= 80) && (
        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Atualize seu plano</p>
              <p className="text-sm text-blue-800">Você está próximo do limite. Atualize para Básico ou Premium para mais recursos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup e Exportação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Exporte todos os dados do seu tenant em um arquivo de backup seguro.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleExport('xlsx')}
              disabled={exporting === 'xlsx'}
              variant="outline"
              className="flex-1"
            >
              {exporting === 'xlsx' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              variant="outline"
              className="flex-1"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar PDF
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            O backup inclui: Clientes, Vendas, Agendamentos, Produtos e Despesas
          </p>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Recurso</th>
                  <th className="text-center py-2 px-3">Gratuito</th>
                  <th className="text-center py-2 px-3">Básico</th>
                  <th className="text-center py-2 px-3">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3">Usuários</td>
                  <td className="text-center">1</td>
                  <td className="text-center">5</td>
                  <td className="text-center">∞</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Clientes</td>
                  <td className="text-center">50</td>
                  <td className="text-center">500</td>
                  <td className="text-center">∞</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Armazenamento</td>
                  <td className="text-center">1 GB</td>
                  <td className="text-center">10 GB</td>
                  <td className="text-center">100 GB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}