import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';

const TYPE_LABELS = {
  avaliacao: 'Avaliação',
  teste: 'Teste de Aparelho',
  ajuste: 'Ajuste',
  manutencao: 'Manutenção',
  retorno: 'Retorno',
};

const DEFAULT_TEMPLATES = {
  avaliacao: `Olá, {nome}! 😊

Passando para confirmar sua *Avaliação Auditiva* conosco na Sonatta!

📅 *Data:* {data}
⏰ *Horário:* {hora}{profissional_linha}

Estamos te esperando! Qualquer dúvida, é só chamar aqui. 🎧

_Sonatta – Soluções Auditivas_`,

  teste: `Olá, {nome}! 😊

Lembrando do seu *Teste de Aparelho Auditivo* marcado na Sonatta!

📅 *Data:* {data}
⏰ *Horário:* {hora}{profissional_linha}

Vamos te ajudar a encontrar a melhor solução auditiva para você! 🎧

_Sonatta – Soluções Auditivas_`,

  ajuste: `Olá, {nome}! 😊

Confirmando seu agendamento de *Ajuste* na Sonatta!

📅 *Data:* {data}
⏰ *Horário:* {hora}{profissional_linha}

Até lá! Qualquer dúvida, estamos à disposição. 🎧

_Sonatta – Soluções Auditivas_`,

  manutencao: `Olá, {nome}! 😊

Seu agendamento de *Manutenção* está confirmado na Sonatta!

📅 *Data:* {data}
⏰ *Horário:* {hora}{profissional_linha}

Vamos cuidar bem do seu aparelho! 🔧🎧

_Sonatta – Soluções Auditivas_`,

  retorno: `Olá, {nome}! 😊

Confirmando seu *Retorno* na Sonatta!

📅 *Data:* {data}
⏰ *Horário:* {hora}{profissional_linha}

Estamos ansiosos para ver como você está! 😊

_Sonatta – Soluções Auditivas_`,
};

const VARIABLES = [
  { key: '{nome}', desc: 'Nome do cliente' },
  { key: '{data}', desc: 'Data do agendamento' },
  { key: '{hora}', desc: 'Horário do agendamento' },
  { key: '{tipo}', desc: 'Tipo do atendimento' },
  { key: '{profissional}', desc: 'Nome do profissional' },
  { key: '{profissional_linha}', desc: 'Linha com profissional (se preenchido)' },
];

export default function WhatsAppAppointmentTemplate() {
  const [templates, setTemplates] = useState({ ...DEFAULT_TEMPLATES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingId, setSettingId] = useState(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const settings = await base44.entities.AppSettings.filter({ key: 'whatsapp_appointment_templates' });
      if (settings.length > 0) {
        setSettingId(settings[0].id);
        setTemplates({ ...DEFAULT_TEMPLATES, ...settings[0].value });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingId) {
        await base44.entities.AppSettings.update(settingId, { key: 'whatsapp_appointment_templates', value: templates });
      } else {
        const result = await base44.entities.AppSettings.create({ key: 'whatsapp_appointment_templates', value: templates });
        setSettingId(result.id);
      }
      toast.success('Templates salvos com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar templates');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (type) => {
    setTemplates(prev => ({ ...prev, [type]: DEFAULT_TEMPLATES[type] }));
    toast.success('Template restaurado para o padrão');
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Templates WhatsApp – Agendamentos</h2>
        <p className="text-sm text-slate-500 mt-1">Configure a mensagem enviada para cada tipo de atendimento.</p>
      </div>

      <Card className="p-4 bg-slate-50 border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-2">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <span key={v.key} className="text-xs bg-white border border-slate-300 rounded px-2 py-1">
              <code className="text-[#6B3FA0] font-bold">{v.key}</code>
              <span className="text-slate-500 ml-1">– {v.desc}</span>
            </span>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="avaliacao">
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">{label}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <TabsContent key={type} value={type} className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Mensagem para: <span className="text-[#6B3FA0]">{label}</span></Label>
              <Button variant="ghost" size="sm" className="text-slate-500 text-xs" onClick={() => handleReset(type)}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Restaurar padrão
              </Button>
            </div>
            <Textarea
              value={templates[type] || ''}
              onChange={(e) => setTemplates(prev => ({ ...prev, [type]: e.target.value }))}
              rows={10}
              className="font-mono text-sm"
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Templates'}
        </Button>
      </div>
    </div>
  );
}