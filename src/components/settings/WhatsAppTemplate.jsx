import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TEMPLATE = `👋 Olá, {{client_name}}!
Temos uma ótima notícia para você: seu orçamento personalizado para redescobrir os sons do mundo está prontinho! ✨

*Orçamento Nº: {{quote_number}}*

*O que preparamos para você:*
{{product_list}}

*Investimento total para sua nova experiência auditiva: {{subtotal}}*

*Pensamos nas melhores formas para você realizar esse investimento na sua saúde:*
* Parcelamento Super Facilitado:* Leve seus aparelhos em até *18X SEM JUROS no cartão!* São parcelas pequenas de apenas *{{installment_value}}* que cabem no seu bolso.
* Descontão à Vista:* Prefere pagar em dinheiro ou Pix? Aproveite um *desconto especial de 10%*! Valor à vista: *{{total}}*

*Sua tranquilidade é nossa prioridade:*
Todos os aparelhos vêm com *{{warranty}}* de garantia, garantindo sua segurança e nosso suporte total.

*Importante:* Esta proposta é válida por 30 dias. Não perca a chance de redescobrir os sons do mundo!

Ficou com alguma dúvida ou quer bater um papo? É só responder essa mensagem, estamos aqui para você! 😊

Com carinho,
Equipe Sonatta Soluções Auditivas
{{contact_phone}}`;

export default function WhatsAppTemplate() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [contactPhone, setContactPhone] = useState('(48) 99999-9999');

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (user.whatsapp_quote_template) {
        setTemplate(user.whatsapp_quote_template);
      }
      if (user.contact_phone) {
        setContactPhone(user.contact_phone);
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        whatsapp_quote_template: template,
        contact_phone: contactPhone
      });
      toast.success('Template salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar o template padrão?')) {
      setTemplate(DEFAULT_TEMPLATE);
      setContactPhone('(48) 99999-9999');
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Personalizar Mensagem de Orçamento
            </h3>
            <p className="text-sm text-slate-600">
              Configure o texto da mensagem que será enviada via WhatsApp ao cliente.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="contactPhone">Telefone de Contato</Label>
              <input
                id="contactPhone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B3FA0]"
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>

            <div>
              <Label htmlFor="template">Template da Mensagem</Label>
              <Textarea
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={20}
                className="mt-1 font-mono text-sm"
                placeholder="Digite o template da mensagem..."
              />
              <p className="text-xs text-slate-500 mt-2">
                <strong>Variáveis disponíveis:</strong> {'{{'} client_name {'}}'}, {'{{'} quote_number {'}}'}, 
                {'{{'} product_list {'}}'}, {'{{'} subtotal {'}}'}, {'{{'} total {'}}'}, 
                {'{{'} installment_value {'}}'}, {'{{'} warranty {'}}'}, {'{{'} contact_phone {'}}'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6B3FA0] hover:bg-[#834CB8]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-slate-800 mb-3">📝 Exemplo de Uso</h4>
        <div className="space-y-2 text-sm text-slate-700">
          <p><strong>{'{{'} client_name {'}}'}</strong> - Nome do cliente</p>
          <p><strong>{'{{'} quote_number {'}}'}</strong> - Número do orçamento</p>
          <p><strong>{'{{'} product_list {'}}'}</strong> - Lista de produtos do orçamento</p>
          <p><strong>{'{{'} subtotal {'}}'}</strong> - Valor subtotal (antes do desconto)</p>
          <p><strong>{'{{'} total {'}}'}</strong> - Valor total (com desconto aplicado)</p>
          <p><strong>{'{{'} installment_value {'}}'}</strong> - Valor de cada parcela (18x)</p>
          <p><strong>{'{{'} warranty {'}}'}</strong> - Período de garantia dos produtos</p>
          <p><strong>{'{{'} contact_phone {'}}'}</strong> - Telefone de contato configurado</p>
        </div>
      </Card>
    </div>
  );
}