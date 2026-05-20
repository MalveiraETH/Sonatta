import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState({});

  const [form, setForm] = useState({
    name: '',
    url: '',
    event_type: '',
    secret: '',
    is_active: true
  });

  useEffect(() => {
    loadWebhooks();
    loadLogs();
  }, []);

  const loadWebhooks = async () => {
    try {
      const data = await base44.entities.Webhook.list();
      setWebhooks(data);
    } catch (error) {
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await base44.entities.WebhookLog.list('-timestamp', 20);
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const generateSecret = () => {
    const secret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setForm({ ...form, secret });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.url || !form.event_type) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      if (!form.secret) generateSecret();

      if (editingId) {
        await base44.entities.Webhook.update(editingId, form);
        toast.success('Webhook atualizado');
      } else {
        await base44.entities.Webhook.create(form);
        toast.success('Webhook criado');
      }

      loadWebhooks();
      setShowForm(false);
      setForm({ name: '', url: '', event_type: '', secret: '', is_active: true });
      setEditingId(null);
    } catch (error) {
      toast.error('Erro ao salvar webhook');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar webhook?')) return;
    try {
      await base44.entities.Webhook.delete(id);
      toast.success('Webhook deletado');
      loadWebhooks();
    } catch (error) {
      toast.error('Erro ao deletar');
    }
  };

  const copySecret = (secret) => {
    navigator.clipboard.writeText(secret);
    toast.success('Copiado!');
  };

  const eventTypes = [
    'sale.created',
    'sale.updated',
    'client.created',
    'client.updated',
    'payment.received',
    'appointment.created'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', url: '', event_type: '', secret: '', is_active: true }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      {/* Lista de Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-gray-500">Nenhum webhook configurado</p>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{webhook.name}</h3>
                    <p className="text-sm text-gray-600">{webhook.url}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{webhook.event_type}</span>
                      {webhook.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Ativo</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Inativo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(webhook.id);
                        setForm(webhook);
                        setShowForm(true);
                      }}
                    >
                      ✏️
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(webhook.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Disparos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Evento</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Resultado</th>
                  <th className="text-left p-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{log.event}</td>
                    <td className="p-2">{log.status}</td>
                    <td className="p-2">
                      {log.success ? (
                        <span className="text-green-600">✓ Sucesso</span>
                      ) : (
                        <span className="text-red-600">✗ Erro: {log.error}</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-600">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Meu Webhook"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Evento</label>
              <Select value={form.event_type} onValueChange={(value) => setForm({ ...form, event_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Secret</label>
              <div className="flex gap-2">
                <Input
                  type={showSecret[form.secret] ? 'text' : 'password'}
                  value={form.secret}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => setShowSecret({ ...showSecret, [form.secret]: !showSecret[form.secret] })}>
                  {showSecret[form.secret] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copySecret(form.secret)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {!form.secret && (
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={generateSecret}>
                  Gerar Secret
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}