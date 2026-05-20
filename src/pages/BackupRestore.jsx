import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('backupDatabase', {});
      
      // Cria download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      setLastBackup(new Date());
      toast.success('Backup criado com sucesso!');
    } catch (error) {
      toast.error(`Erro no backup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup_file', file);

      const response = await base44.functions.invoke('restoreDatabase', {
        backup_file: await file.text()
      });

      toast.success(`Restaurado: ${response.data.restored} registros`);
      e.target.value = ''; // Reset input
    } catch (error) {
      toast.error(`Erro na restauração: ${error.message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <p className="text-gray-600">Gerencie backups automáticos e restauração de dados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Criar Backup
            </CardTitle>
            <CardDescription>
              Exporta todos os dados da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Os backups automáticos são executados diariamente às 02:00 UTC
              </p>
            </div>

            {lastBackup && (
              <div className="bg-green-50 border border-green-200 rounded p-3 flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-medium">Último backup</p>
                  <p>{lastBackup.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleBackup}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Backup Agora
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 space-y-1">
              <p>✓ Todos os clientes e vendas</p>
              <p>✓ Orçamentos e contratos</p>
              <p>✓ Agendamentos e testes</p>
              <p>✓ Estoque e produtos</p>
              <p>✓ Histórico financeiro</p>
            </div>
          </CardContent>
        </Card>

        {/* Restore Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Restaurar Dados
            </CardTitle>
            <CardDescription>
              Importa dados de um backup anterior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700">
                ⚠️ Isso substituirá os dados atuais. Crie um backup antes de restaurar!
              </p>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={restoring}
                className="hidden"
                id="backup-input"
              />
              <label htmlFor="backup-input">
                <Button
                  asChild
                  className="w-full cursor-pointer"
                  variant="outline"
                  disabled={restoring}
                >
                  <span>
                    {restoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </label>

            <div className="text-xs text-gray-500">
              <p className="font-medium mb-2">Requisitos do arquivo:</p>
              <p>✓ Formato JSON</p>
              <p>✓ Criado por nossa ferramenta</p>
              <p>✓ Máximo 50MB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Backups</CardTitle>
          <CardDescription>
            Histórico de backups automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-sm text-gray-600 font-medium pb-2 border-b">
              <div>Data</div>
              <div>Tamanho</div>
              <div>Status</div>
              <div>Ação</div>
            </div>
            {/* Placeholder - em produção, buscar do S3/GitHub */}
            <div className="grid grid-cols-4 gap-2 text-sm py-2">
              <div className="text-gray-700">2026-05-20</div>
              <div className="text-gray-600">4.2 MB</div>
              <div className="text-green-600 font-medium">✓ Sucesso</div>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disaster Recovery Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plano de Recuperação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-gray-900 mb-1">1. Backup Automático Diário</p>
            <p className="text-gray-600">Executado 02:00 UTC, armazenado em S3 + GitHub</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">2. Retenção de 30 dias</p>
            <p className="text-gray-600">Mantemos os últimos 30 backups para recuperação</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">3. RTO: 1 hora</p>
            <p className="text-gray-600">Tempo máximo para restaurar serviço após falha</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">4. RPO: 24 horas</p>
            <p className="text-gray-600">Perda máxima de dados: até 24h antes do backup</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}