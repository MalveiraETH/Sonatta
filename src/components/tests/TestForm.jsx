import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TestForm({ open, onClose, test, onSuccess, extendMode = false, preselectedClientId = null, preselectedAppointmentData = null }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [products, setProducts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    devices: [],
    professional_id: '',
    referral_professional_id: '',
    status: 'em_teste',
    notes: ''
  });

  // Load reference data first
  useEffect(() => {
    if (open) {
      setDataLoaded(false);
      loadData();
    }
  }, [open]);

  // Populate form only after data is loaded (so selects find their values)
  useEffect(() => {
    if (open && dataLoaded) {
      if (test) {
        setFormData({
          client_id: test.client_id || '',
          start_date: test.start_date || '',
          start_time: test.start_time || '',
          end_date: test.end_date || '',
          end_time: test.end_time || '',
          devices: test.devices || [],
          professional_id: test.professional_id || '',
          referral_professional_id: test.referral_professional_id || '',
          status: test.status || 'em_teste',
          notes: test.notes || ''
        });
      } else {
        const appt = preselectedAppointmentData;
        setFormData({
          client_id: appt?.client_id || preselectedClientId || '',
          start_date: appt?.date || format(new Date(), 'yyyy-MM-dd'),
          start_time: appt?.time || '',
          end_date: '',
          end_time: '',
          devices: [],
          professional_id: appt?.professional_id || '',
          referral_professional_id: appt?.test_referral_id || '',
          status: 'em_teste',
          notes: ''
        });
      }
    }
  }, [open, dataLoaded, test]);

  const loadData = async () => {
    try {
      const [clientsData, professionalsData, productsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Professional.list(),
        base44.entities.Product.filter({ stock_type: 'serializado', status: 'disponivel' })
      ]);
      setClients(clientsData);
      setProfessionals(professionalsData);
      setProducts(productsData);
      setDataLoaded(true);
    } catch (error) {
      console.error(error);
    }
  };

  const addDevice = () => {
    setFormData({ ...formData, devices: [...formData.devices, { product_id: '', product_name: '', serial_number: '' }] });
  };

  const removeDevice = (index) => {
    setFormData({ ...formData, devices: formData.devices.filter((_, i) => i !== index) });
  };

  const updateDevice = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newDevices = [...formData.devices];
      newDevices[index] = { product_id: product.id, product_name: product.name, serial_number: product.serial_number };
      setFormData({ ...formData, devices: newDevices });
    }
  };

  const updateClientStatus = async (clientId, testStatus) => {
    try {
      const clientStatus = testStatus === 'teste_finalizado' ? 'cliente_ativo' : 'em_teste';
      await base44.entities.Client.update(clientId, { status: clientStatus });
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
    }
  };

  // Sync the linked "teste" appointment for this client with new date/time/professional
  const syncAppointment = async (testData) => {
    try {
      if (!testData.client_id) return;

      // List all appointments and find ones for this client of type 'teste'
      const allAppointments = await base44.entities.Appointment.list();
      const linked = allAppointments.filter(
        (a) => a.client_id === testData.client_id && a.type === 'teste'
      );

      if (linked.length === 0) return;

      // Use the most recent one
      const appt = linked.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

      const updates = {};
      if (testData.start_date) updates.date = testData.start_date;
      if (testData.start_time) updates.time = testData.start_time;
      if (testData.professional_id) updates.professional_id = testData.professional_id;
      if (testData.professional_name) updates.professional_name = testData.professional_name;
      if (testData.referral_professional_id) updates.test_referral_id = testData.referral_professional_id;
      if (testData.referral_professional_name) updates.test_referral_name = testData.referral_professional_name;

      await base44.entities.Appointment.update(appt.id, updates);
    } catch (error) {
      console.error('Erro ao sincronizar agendamento:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const client = clients.find((c) => c.id === formData.client_id);
      const professional = professionals.find((p) => p.id === formData.professional_id);
      const referralProfessional = professionals.find((p) => p.id === formData.referral_professional_id);

      const testData = {
        ...formData,
        client_name: client?.full_name,
        professional_name: professional?.full_name,
        referral_professional_name: referralProfessional?.full_name,
        status: extendMode ? 'teste_estendido' : formData.status
      };

      if (test) {
        await base44.entities.Test.update(test.id, testData);
        await updateClientStatus(formData.client_id, testData.status);
        await syncAppointment(testData);
        toast.success('Teste atualizado');
      } else {
        const testsCount = await base44.entities.Test.list();
        testData.test_number = `TST-${String(testsCount.length + 1).padStart(4, '0')}`;
        await base44.entities.Test.create(testData);
        await updateClientStatus(formData.client_id, testData.status);
        toast.success('Teste cadastrado');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{extendMode ? 'Estender Teste' : test ? 'Editar Teste' : 'Novo Teste'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!extendMode && (
            <>
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  <Label>Horário Início</Label>
                  <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Final *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  <Label>Horário Final</Label>
                  <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Aparelhos</Label>
                  <Button type="button" size="sm" onClick={addDevice} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Aparelho
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.devices.map((device, index) => (
                    <div key={index} className="flex gap-2">
                      <Select value={device.product_id} onValueChange={(v) => updateDevice(index, v)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione por NS" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - NS: {product.serial_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeDevice(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Profissional Atendimento</Label>
                <Select value={formData.professional_id} onValueChange={(v) => setFormData({ ...formData, professional_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>{prof.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Profissional Indicação Teste</Label>
                <Select value={formData.referral_professional_id} onValueChange={(v) => setFormData({ ...formData, referral_professional_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional de indicação" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>{prof.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_teste">Em Teste</SelectItem>
                    <SelectItem value="teste_estendido">Teste Estendido</SelectItem>
                    <SelectItem value="teste_finalizado">Teste Finalizado</SelectItem>
                    <SelectItem value="teste_pendente">Teste Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
            </>
          )}

          {extendMode && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nova Data Final *</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                <Label>Horário Final</Label>
                <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}