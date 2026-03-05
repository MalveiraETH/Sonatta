import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AppointmentForm({ open, onOpenChange, appointment, onSuccess, preselectedClient }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    professional_id: '',
    professional_name: '',
    test_referral_id: '',
    test_referral_name: '',
    date: '',
    time: '',
    type: 'avaliacao',
    status: 'agendado',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (appointment) {
      setFormData({
        client_id: appointment.client_id || '',
        client_name: appointment.client_name || '',
        professional_id: appointment.professional_id || '',
        professional_name: appointment.professional_name || '',
        test_referral_id: appointment.test_referral_id || '',
        test_referral_name: appointment.test_referral_name || '',
        date: appointment.date || '',
        time: appointment.time || '',
        type: appointment.type || 'avaliacao',
        status: appointment.status || 'agendado',
        notes: appointment.notes || ''
      });
    } else if (preselectedClient) {
      setFormData((prev) => ({
        ...prev,
        client_id: preselectedClient.id,
        client_name: preselectedClient.full_name,
        test_referral_id: '',
        test_referral_name: '',
        date: '',
        time: '',
        type: 'avaliacao',
        status: 'agendado',
        notes: ''
      }));
    } else {
      setFormData({
        client_id: '',
        client_name: '',
        professional_id: '',
        professional_name: '',
        test_referral_id: '',
        test_referral_name: '',
        date: '',
        time: '',
        type: 'avaliacao',
        status: 'agendado',
        notes: ''
      });
    }
  }, [appointment, preselectedClient, open]);

  const loadData = async () => {
    try {
      const [clientsData, professionalsData] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.Professional.list()]
      );
      setClients(clientsData);
      setProfessionals(professionalsData);
    } catch (e) {
      console.error(e);
    }
  };

  const checkTimeConflict = async (date, time) => {
    try {
      const allAppointments = await base44.entities.Appointment.list();
      const conflict = allAppointments.find((apt) =>
      apt.date === date &&
      apt.time === time &&
      apt.status !== 'cancelado' &&
      apt.id !== appointment?.id
      );
      return !!conflict;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.full_name || ''
    });
  };

  const handleProfessionalChange = (profId) => {
    const prof = professionals.find((p) => p.id === profId);
    setFormData({
      ...formData,
      professional_id: profId,
      professional_name: prof?.full_name || ''
    });
  };

  const handleTestReferralChange = (profId) => {
    const prof = professionals.find((p) => p.id === profId);
    setFormData({
      ...formData,
      test_referral_id: profId,
      test_referral_name: prof?.full_name || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.date || !formData.time || !formData.type) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (appointment) {
        await base44.entities.Appointment.update(appointment.id, formData);
        toast.success('Agendamento atualizado!');
      } else {
        await base44.entities.Appointment.create(formData);
        toast.success('Agendamento criado com sucesso!');
      }
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Erro ao salvar agendamento: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels = {
    avaliacao: 'Avaliação',
    teste: 'Teste de Aparelho',
    ajuste: 'Ajuste',
    manutencao: 'Manutenção',
    retorno: 'Retorno'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Input
              placeholder="Digite o nome do cliente..."
              value={formData.client_name || ''}
              onChange={(e) => {
                const searchValue = e.target.value;
                setFormData({ ...formData, client_name: searchValue, client_id: '' });

                const searchTerm = searchValue.toLowerCase();
                const found = clients.find((c) =>
                c.full_name?.toLowerCase() === searchTerm
                );
                if (found) {
                  handleClientChange(found.id);
                }
              }}
              list="clients-list-appt" />

            <datalist id="clients-list-appt">
              {clients.map((client) =>
              <option key={client.id} value={client.full_name}>
                  {client.full_name}
                </option>
              )}
            </datalist>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Profissional Atendimento</Label>
              <Select
                value={formData.professional_id}
                onValueChange={handleProfessionalChange}>

                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((prof) =>
                  <SelectItem key={prof.id} value={prof.id}>
                      {prof.full_name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />

            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })} />

            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}>

                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) =>
                  <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}>

                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre o agendamento"
              rows={3} />

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">

              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {appointment ? 'Salvar' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

}