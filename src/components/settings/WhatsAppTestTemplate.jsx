import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';

export const TEST_TEMPLATES_DEFAULTS = {
  em_teste: `🦻 *Início de Teste - Aparelho Auditivo*

Olá {{client_name}},

Seu teste foi iniciado com sucesso!

📅 *Data de Início:* {{start_date}}{{start_time}}
📅 *Data de Retorno:* {{end_date}}{{end_time}}

🎧 *Aparelhos para Teste:*
{{devices_list}}

Em caso de dúvidas, entre em contato conosco.

*Sonatta Soluções Auditivas*`,

  teste_estendido: `🔄 *Teste Estendido - Aparelho Auditivo*

Olá {{client_name}},

Seu teste foi estendido! 😊

📅 *Nova Data de Retorno:* {{end_date}}{{end_time}}

🎧 *Aparelhos em Teste:*
{{devices_list}}

Qualquer dúvida, estamos à disposição!

*Sonatta Soluções Auditivas*`,

  teste_pendente: `⏰ *Lembrete - Retorno do Teste*

Olá {{client_name}},

Notamos que chegou a data de retorno do seu teste de aparelho auditivo.

📅 *Data de Retorno prevista:* {{end_date}}{{end_time}}

🎧 *Aparelhos em Teste:*
{{devices_list}}

Por favor, entre em contato para agendar seu retorno ou tirar dúvidas.

*Sonatta Soluções Auditivas*`,

  teste_finalizado: `✅ *Teste Finalizado - Aparelho Auditivo*

Olá {{client_name}},

Seu teste de aparelho auditivo foi finalizado.

📅 *Período do Teste:* {{start_date}} até {{end_date}}

🎧 *Aparelhos Testados:*
{{devices_list}}

Obrigado pela participação! Em breve entraremos em contato com as próximas etapas.

*Sonatta Soluções Auditivas*`
};

const STATUS_LABELS = {
  em_teste: { label: 'Em Teste', color: 'text-blue-600' },
  teste_estendido: { label: 'Estendido', color: 'text-amber-600' },
  teste_pendente: { label: 'Pendente', color: 'text-red-600' },
  teste_finalizado: { label: 'Finalizado', color: 'text-emerald-600' },
};

const VARIABLES_HELP = [
  { var: '{{client_name}}', desc: 'Nome do cliente' },
  { var: '{{start_date}}', desc: 'Data de início' },
  { var: '{{start_time}}', desc: 'Horário de início' },
  { var: '{{end_date}}', desc: 'Data de retorno' },
  { var: '{{end_time}}', desc: 'Horário de retorno' },
  { var: '{{devices_list}}', desc: 'Lista de aparelhos' },
];

export default function WhatsAppTestTemplate() {
  const [templates, setTemplates] = useState({ ...TEST_TEMPLATES_DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const saved = userData.whatsapp_test_templates || {};
      setTemplates({
        em_teste: saved.em_teste || TEST_TEMPLATES_DEFAULTS.em_teste,
        teste_estendido: saved.teste_estendido || TEST_TEMPLATES_DEFAULTS.teste_estendido,
        teste_pendente: saved.teste_pendente || TEST_TEMPLATES_DEFAULTS.teste_pendente,
        teste_finalizado: saved.teste_finalizado || TEST_TEMPLATES_DEFAULTS.teste_finalizado,
      });
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleSave = async () => {
    if (user?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.updateMe({ whatsapp_test_templates: templates });
      toast.success('Templates salvos com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (status) => {
    if (user?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    setTemplates(prev => ({ ...prev, [status]: TEST_TEMPLATES_DEFAULTS[status] }));
    toast.info('Template restaurado para o padrão');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Templates de WhatsApp por Status de Teste</h3>
            <p className="text-sm text-slate-500 mt-1">
              Configure mensagens automáticas para cada status do teste.
              {!isAdmin && <span className="text-red-600 ml-2">(Somente visualização)</span>}
            </p>
          </div>

          <Tabs defaultValue="em_teste">
            <TabsList className="flex-wrap h-auto gap-1">
              {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <TabsContent key={key} value={key} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Mensagem para status: <span className="font-semibold">{label}</span></Label>
                  <Textarea
                    value={templates[key]}
                    onChange={(e) => setTemplates(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={16}
                    className="font-mono text-sm"
                    disabled={!isAdmin}
                  />
                </div>
                {isAdmin && (
                  <Button onClick={() => handleReset(key)} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Padrão ({label})
                  </Button>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">Variáveis disponíveis (todos os templates):</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              {VARIABLES_HELP.map(({ var: v, desc }) => (
                <div key={v}><code className="bg-blue-100 px-2 py-0.5 rounded">{v}</code> - {desc}</div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <Button onClick={handleSave} disabled={loading} className="w-full bg-[#6B3FA0] hover:bg-[#834CB8]">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Todos os Templates'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}