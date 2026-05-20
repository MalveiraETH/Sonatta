import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppButton({ phone, clientName }) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState('custom');
  const [customMessage, setCustomMessage] = useState('');

  const templates = {
    custom: 'Mensagem customizada',
    sale_confirmation: 'Confirmação de venda',
    appointment_reminder: 'Lembrete de agendamento',
    payment_reminder: 'Lembrete de pagamento',
    appointment_confirmation: 'Confirmação de agendamento',
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('sendWhatsAppMessage', {
        phone,
        message: messageType === 'custom' ? customMessage : undefined,
        template_name: messageType !== 'custom' ? messageType : undefined,
        template_data: { client_name: clientName },
      });

      toast.success('Mensagem enviada!');
      setShowDialog(false);
      setCustomMessage('');
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="text-green-600 border-green-600 hover:bg-green-50"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        WhatsApp
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Para: {phone}</label>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Mensagem</label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(templates).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {messageType === 'custom' && (
              <div>
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || !customMessage && messageType === 'custom'}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}