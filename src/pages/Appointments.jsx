import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import TestForm from '@/components/tests/TestForm';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MessageCircle,
  Edit,
  Trash2,
  Ear
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Appointments() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('day');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [preselectedAppointmentForTest, setPreselectedAppointmentForTest] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appointmentsData, user] = await Promise.all([
        base44.entities.Appointment.list(),
        base44.auth.me()
      ]);
      setAppointments(appointmentsData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setFormOpen(true);
  };

  const handleDelete = async (appointment) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      await base44.entities.Appointment.delete(appointment.id);
      toast.success('Agendamento excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const handleStatusChange = async (appointment, newStatus) => {
    try {
      await base44.entities.Appointment.update(appointment.id, { status: newStatus });
      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const sendWhatsApp = (appointment) => {
    // Would need to get client phone from clients entity
    toast.info('Função de WhatsApp será implementada');
  };

  const getFilteredAppointments = () => {
    let filtered = [...appointments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (view === 'day') {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.date === dateStr);
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      filtered = filtered.filter(a => {
        const date = new Date(a.date);
        return date >= start && date <= end;
      });
    }

    return filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  };

  const typeLabels = {
    avaliacao: 'Avaliação',
    teste: 'Teste',
    ajuste: 'Ajuste',
    manutencao: 'Manutenção',
    retorno: 'Retorno'
  };

  const typeColors = {
    avaliacao: 'bg-blue-100 border-blue-300',
    teste: 'bg-purple-100 border-purple-300',
    ajuste: 'bg-amber-100 border-amber-300',
    manutencao: 'bg-slate-100 border-slate-300',
    retorno: 'bg-emerald-100 border-emerald-300'
  };

  const navigateDate = (direction) => {
    if (view === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 })
  });

  const filteredAppointments = getFilteredAppointments();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description="Gerencie sua agenda de atendimentos"
        action={() => {
          setSelectedAppointment(null);
          setFormOpen(true);
        }}
        actionLabel="Novo Agendamento"
      />

      {/* Controls */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-4 font-semibold text-slate-800">
              {view === 'day'
                ? format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                : `Semana de ${format(weekDays[0], 'd', { locale: ptBR })} a ${format(weekDays[6], "d 'de' MMMM", { locale: ptBR })}`
              }
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* Week View Header */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
              className={cn(
                "p-3 rounded-lg text-center transition-colors",
                isToday(day) && "bg-[#1e3a5f] text-white",
                isSameDay(day, currentDate) && !isToday(day) && "bg-[#c9a227]/20 border border-[#c9a227]",
                !isToday(day) && !isSameDay(day, currentDate) && "bg-slate-50 hover:bg-slate-100"
              )}
            >
              <p className="text-xs font-medium uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </p>
              <p className="text-lg font-bold">{format(day, 'd')}</p>
              <p className="text-xs mt-1">
                {appointments.filter(a => a.date === format(day, 'yyyy-MM-dd')).length} agend.
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className={cn(
                "p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow",
                typeColors[appointment.type]
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{appointment.time}</span>
                      {view === 'week' && (
                        <span className="text-sm text-slate-500">
                          {format(new Date(appointment.date), 'dd/MM')}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white">
                        {typeLabels[appointment.type]}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">
                      {appointment.client_name}
                    </p>
                    {appointment.professional_name && (
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {appointment.professional_name}
                      </p>
                    )}
                    {appointment.notes && (
                      <p className="text-sm text-slate-500 mt-1">{appointment.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={appointment.status} />
                  
                  <Select
                    value={appointment.status}
                    onValueChange={(value) => handleStatusChange(appointment, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPreselectedAppointmentForTest(appointment);
                      setTestFormOpen(true);
                    }}
                    title="Cadastrar Teste"
                  >
                    <Ear className="h-4 w-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => handleEdit(appointment)}>
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(appointment)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 border-0 shadow-sm">
            <div className="text-center text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Nenhum agendamento para este período</p>
              <Button
                className="mt-4 bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                onClick={() => {
                  setSelectedAppointment(null);
                  setFormOpen(true);
                }}
              >
                Criar Agendamento
              </Button>
            </div>
          </Card>
        )}
      </div>

      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={selectedAppointment}
        onSuccess={loadData}
      />

      <TestForm
        open={testFormOpen}
        onClose={() => setTestFormOpen(false)}
        preselectedAppointmentData={preselectedAppointmentForTest}
        onSuccess={loadData}
      />
    </div>
  );
}