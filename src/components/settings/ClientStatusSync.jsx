import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientStatusSync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fixStatuses = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('fixClientStatuses', {});
      
      if (response.data.success) {
        setResult(response.data);
        toast.success(response.data.message);
      } else {
        toast.error('Erro ao corrigir status dos clientes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao executar correção');
    } finally {
      setLoading(false);
    }
  };

  const checkPostSale = async () => {
    setLoading(true);
    
    try {
      const response = await base44.functions.invoke('checkAndUpdatePostSale', {});
      
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error('Erro ao verificar pós-venda');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao executar verificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sincronização de Status</h3>
        
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Correção de Status:</strong> Analisa todos os clientes e corrige os status com base na lógica:
            <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
              <li><strong>Lead:</strong> Cliente sem teste e sem venda</li>
              <li><strong>Teste Agendado:</strong> Cliente com teste no status "teste_agendado"</li>
              <li><strong>Em Teste:</strong> Cliente com teste no status "em_teste"</li>
              <li><strong>Teste Estendido:</strong> Cliente com teste no status "teste_estendido"</li>
              <li><strong>Teste Finalizado:</strong> Cliente com teste no status "teste_finalizado"</li>
              <li><strong>Teste Pendente:</strong> Cliente com teste no status "teste_pendente"</li>
              <li><strong>Cliente Ativo:</strong> Cliente com venda paga dentro da garantia</li>
              <li><strong>Pós-Venda:</strong> Cliente com venda paga fora do período de garantia</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            onClick={fixStatuses}
            disabled={loading}
            className="w-full bg-[#6B3FA0] hover:bg-[#834CB8]"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Corrigir Status de Todos os Clientes
              </>
            )}
          </Button>

          <Button
            onClick={checkPostSale}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verificar Clientes Pós-Venda
              </>
            )}
          </Button>
        </div>
      </Card>

      {result && result.corrections && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-emerald-600">
            Resultado da Correção
          </h3>
          
          <div className="space-y-3">
            {Object.entries(result.corrections).map(([status, clients]) => {
              if (clients.length === 0) return null;
              
              const statusLabels = {
                lead: 'Lead',
                teste_agendado: 'Teste Agendado',
                em_teste: 'Em Teste',
                teste_estendido: 'Teste Estendido',
                teste_finalizado: 'Teste Finalizado',
                teste_pendente: 'Teste Pendente',
                cliente_ativo: 'Cliente Ativo',
                pos_venda: 'Pós-Venda'
              };

              return (
                <div key={status} className="border-l-4 border-[#6B3FA0] pl-4">
                  <p className="font-semibold text-slate-700">
                    {statusLabels[status]} ({clients.length})
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {clients.join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}