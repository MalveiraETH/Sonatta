import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForceUpdate() {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');

  const handleForceUpdate = async () => {
    if (!confirm('Isso irá recarregar o aplicativo para TODOS os usuários conectados. Deseja continuar?')) {
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('forceAppUpdate', { description });
      toast.success('Atualização forçada! Todos os usuários serão atualizados em até 30 segundos.');
      setDescription('');
    } catch (error) {
      toast.error('Erro ao forçar atualização: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-[#6B3FA0]" />
          <CardTitle>Forçar Atualização do Sistema</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Atenção!</p>
              <p>Ao clicar em "Forçar Atualização", todos os usuários conectados ao sistema serão automaticamente redirecionados para recarregar a página em até 30 segundos. Use apenas quando houver atualizações críticas.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição da Atualização (opcional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Correções de bugs importantes"
          />
        </div>

        <Button
          onClick={handleForceUpdate}
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
              <RefreshCw className="h-4 w-4 mr-2" />
              Forçar Atualização para Todos os Usuários
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}