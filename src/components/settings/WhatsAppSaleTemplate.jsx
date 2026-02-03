import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, RotateCcw } from 'lucide-react';

export default function WhatsAppSaleTemplate() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update' && event.data.whatsapp_sale_template) {
        setTemplate(event.data.whatsapp_sale_template);
      }
    });
    return () => unsubscribe();
  }, []);

  const defaultTemplate = `🎉 *Parabéns pela sua compra!* 🎉

Olá {{client_name}},

Sua compra foi confirmada com sucesso!

📋 *Detalhes da Venda*
*Venda:* {{sale_number}}
*Data:* {{sale_date}}

🦻 *Aparelhos Adquiridos:*
{{products_list}}

💰 *Valores:*
*Subtotal:* {{subtotal}}
*Desconto:* {{discount}}
*TOTAL:* {{total}}

💳 *Formas de Pagamento:*
{{payments_list}}

Obrigado pela preferência!

*Sonatta Soluções Auditivas*`;

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setTemplate(userData.whatsapp_sale_template || defaultTemplate);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      setTemplate(defaultTemplate);
    }
  };

  const handleSave = async () => {
    if (user?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.updateMe({
        whatsapp_sale_template: template
      });
      toast.success('Template salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (user?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    setTemplate(defaultTemplate);
    toast.info('Template restaurado para o padrão');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Template de WhatsApp para Vendas</h3>
            <p className="text-sm text-slate-500 mt-1">
              Personalize a mensagem enviada aos clientes após uma venda
              {!isAdmin && <span className="text-red-600 ml-2">(Somente visualização - Apenas administradores podem editar)</span>}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensagem do Template</Label>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Digite o template aqui..."
              disabled={!isAdmin}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">Variáveis disponíveis:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{client_name}}'}</code> - Nome do cliente</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{sale_number}}'}</code> - Número da venda</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{sale_date}}'}</code> - Data da venda</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{products_list}}'}</code> - Lista de aparelhos</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{subtotal}}'}</code> - Subtotal</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{discount}}'}</code> - Desconto</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{total}}'}</code> - Valor total</div>
              <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{payments_list}}'}</code> - Formas de pagamento</div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Template'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}