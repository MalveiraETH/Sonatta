import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import TestForm from '@/components/tests/TestForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Ear,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  X,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { openWhatsApp } from '@/utils/whatsapp';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  agendado:   { label: 'Agendado',   bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-l-amber-400'   },
  confirmado: { label: 'Confirmado', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-l-emerald-500' },
  realizado:  { label: 'Realizado',  bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-l-slate-400'   },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-l-red-500'     },
  faltou:     { label: 'Faltou',     bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-l-orange-500'  },
};

const TYPE_LABELS = {
  avaliacao: 'Avaliação',
  teste: 'Teste',
  ajuste: 'Ajuste',
  manutencao: 'Manutenção',
  retorno: 'Retorno',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.agendado;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function AppointmentCard({ appointment, onEdit, onDelete, onStatusChange, onTest, hasConflict }) {
  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.agendado;

  const sendWhatsApp = async () => {
    try {
      const clients = await base44.entities.Client.filter({ id: appointment.client_id });
      const phone = clients[0]?.phone?.replace(/\D/g, '');
      if (!phone) { toast.error('Cliente sem telefone cadastrado'); return; }

      // Load template
      const DEFAULT_TEMPLATES = {
        avaliacao: `Olá, {nome}! 😊\n\nPassando para confirmar sua *Avaliação Auditiva* conosco na Sonatta!\n\n📅 *Data:* {data}\n⏰ *Horário:* {hora}{profissional_linha}\n\nEstamos te esperando! Qualquer dúvida, é só chamar aqui. 🎧\n\n_Sonatta – Soluções Auditivas_`,
        teste: `Olá, {nome}! 😊\n\nLembrando do seu *Teste de Aparelho Auditivo* marcado na Sonatta!\n\n📅 *Data:* {data}\n⏰ *Horário:* {hora}{profissional_linha}\n\nVamos te ajudar a encontrar a melhor solução auditiva para você! 🎧\n\n_Sonatta – Soluções Auditivas_`,
        ajuste: `Olá, {nome}! 😊\n\nConfirmando seu agendamento de *Ajuste* na Sonatta!\n\n📅 *Data:* {data}\n⏰ *Horário:* {hora}{profissional_linha}\n\nAté lá! Qualquer dúvida, estamos à disposição. 🎧\n\n_Sonatta – Soluções Auditivas_`,
        manutencao: `Olá, {nome}! 😊\n\nSeu agendamento de *Manutenção* está confirmado na Sonatta!\n\n📅 *Data:* {data}\n⏰ *Horário:* {hora}{profissional_linha}\n\nVamos cuidar bem do seu aparelho! 🔧🎧\n\n_Sonatta – Soluções Auditivas_`,
        retorno: `Olá, {nome}! 😊\n\nConfirmando seu *Retorno* na Sonatta!\n\n📅 *Data:* {data}\n⏰ *Horário:* {hora}{profissional_linha}\n\nEstamos ansiosos para ver como você está! 😊\n\n_Sonatta – Soluções Auditivas_`,
      };

      let templateText = DEFAULT_TEMPLATES[appointment.type] || DEFAULT_TEMPLATES.avaliacao;
      try {
        const settings = await base44.entities.AppSettings.filter({ key: 'whatsapp_appointment_templates' });
        if (settings.length > 0 && settings[0].value?.[appointment.type]) {
          templateText = settings[0].value[appointment.type];
        }
      } catch (e) { /* use default */ }

      const dateFormatted = appointment.date
        ? new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const profLine = appointment.professional_name ? `\n👩‍⚕️ *Profissional:* ${appointment.professional_name}` : '';

      const message = templateText
        .replace(/{nome}/g, appointment.client_name || '')
        .replace(/{data}/g, dateFormatted)
        .replace(/{hora}/g, appointment.time || '')
        .replace(/{tipo}/g, TYPE_LABELS[appointment.type] || appointment.type)
        .replace(/{profissional}/g, appointment.professional_name || '')
        .replace(/{profissional_linha}/g, profLine);

      openWhatsApp(`55${phone}`, message);
    } catch { toast.error('Erro ao abrir WhatsApp'); }
  };

  return (
    <div className={cn(
      'group relative bg-white rounded-lg border border-slate-200 border-l-4 shadow-sm hover:shadow-md transition-all',
      cfg.border,
      hasConflict && 'ring-2 ring-red-300'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-14 text-center">
          <p className="text-base font-bold text-slate-800 tabular-nums">{appointment.time}</p>
          <p className="text-xs text-slate-400">{format(new Date(appointment.date + 'T12:00:00'), 'dd/MM')}</p>
        </div>

        <div className="w-px h-10 bg-slate-200 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 truncate">{appointment.client_name}</p>
            {hasConflict && <span className="text-xs text-red-500 font-medium">⚠ Conflito</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {TYPE_LABELS[appointment.type] || appointment.type}
            {appointment.professional_name && ` · ${appointment.professional_name}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={appointment.status} />

          {appointment.status === 'agendado' && (
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white hidden sm:flex"
              onClick={() => onStatusChange(appointment, 'confirmado')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Confirmar
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(appointment)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {appointment.status === 'agendado' && (
                <DropdownMenuItem onClick={() => onStatusChange(appointment, 'confirmado')}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Confirmar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onStatusChange(appointment, 'realizado')}>
                <CheckCircle className="h-4 w-4 mr-2 text-slate-500" />
                Marcar Realizado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(appointment, 'faltou')}>
                <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                Faltou
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(appointment, 'cancelado')}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Cancelar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTest(appointment)}>
                <Ear className="h-4 w-4 mr-2 text-[#6B3FA0]" />
                Cadastrar Teste
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(appointment)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('day');
  const [statusFilter, setStatusFilter] = useState('all');
  const [professionalFilter, setProfessionalFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [professionals, setProfessionals] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [preselectedAppointmentForTest, setPreselectedAppointmentForTest] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.Appointment.subscribe(() => {
      base44.entities.Appointment.list().then(setAppointments);
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const [appointmentsData, profsData] = await Promise.all([
        base44.entities.Appointment.list(),
        base44.entities.Professional.list(),
      ]);
      setAppointments(appointmentsData);
      setProfessionals(profsData);
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

  const handleDelete = (appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await base44.entities.Appointment.delete(appointmentToDelete.id);
      toast.success('Agendamento excluído');
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
      loadData();
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleStatusChange = async (appointment, newStatus) => {
    try {
      await base44.entities.Appointment.update(appointment.id, { status: newStatus });
      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Status alterado para ${label}`);
      loadData();
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleTest = (appointment) => {
    setPreselectedAppointmentForTest(appointment);
    setTestFormOpen(true);
  };

  const getConflicts = () => {
    const map = {};
    appointments.filter(a => a.status !== 'cancelado').forEach(a => {
      const key = `${a.date}_${a.time}`;
      if (!map[key]) map[key] = [];
      map[key].push(a.id);
    });
    const conflictIds = new Set();
    Object.values(map).forEach(ids => {
      if (ids.length > 1) ids.forEach(id => conflictIds.add(id));
    });
    return conflictIds;
  };

  const conflictIds = getConflicts();

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });

  const getFilteredAppointments = () => {
    let filtered = [...appointments];
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
    if (professionalFilter !== 'all') filtered = filtered.filter(a => a.professional_id === professionalFilter);
    if (searchTerm) filtered = filtered.filter(a => a.client_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (view === 'day') {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.date === dateStr);
    } else {
      const start = weekDays[0];
      const end = weekDays[6];
      filtered = filtered.filter(a => {
        const d = new Date(a.date + 'T12:00:00');
        return d >= start && d <= end;
      });
    }

    return filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
  };

  const navigateDate = (dir) => {
    if (view === 'day') setCurrentDate(dir === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else setCurrentDate(dir === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setProfessionalFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = statusFilter !== 'all' || professionalFilter !== 'all' || searchTerm;
  const filteredAppointments = getFilteredAppointments();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agendamentos</h1>
          <p className="text-sm text-slate-500">Gerencie sua agenda de atendimentos</p>
        </div>
        <Button
          className="bg-[#6B3FA0] hover:bg-[#834CB8]"
          onClick={() => { setSelectedAppointment(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <Card className="p-3 border-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 text-sm" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-slate-800 text-sm ml-2">
              {view === 'day'
                ? format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                : `Semana de ${format(weekDays[0], "d MMM", { locale: ptBR })} a ${format(weekDays[6], "d MMM", { locale: ptBR })}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              className={view === 'day' ? 'bg-[#6B3FA0] hover:bg-[#834CB8]' : ''}
              onClick={() => setView('day')}
            >
              Dia
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              className={view === 'week' ? 'bg-[#6B3FA0] hover:bg-[#834CB8]' : ''}
              onClick={() => setView('week')}
            >
              Semana
            </Button>
          </div>
        </div>
      </Card>

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppts = appointments.filter(a => a.date === dateStr && a.status !== 'cancelado');
            const isSelected = isSameDay(day, currentDate);
            const todayDay = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setCurrentDate(day); setView('day'); }}
                className={cn(
                  'p-2 rounded-lg text-center transition-all border',
                  todayDay && 'bg-[#6B3FA0] text-white border-[#6B3FA0]',
                  isSelected && !todayDay && 'bg-[#6B3FA0]/10 border-[#6B3FA0] text-[#6B3FA0]',
                  !todayDay && !isSelected && 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <p className="text-xs font-medium uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
                <p className="text-lg font-bold leading-tight">{format(day, 'd')}</p>
                {dayAppts.length > 0 && (
                  <div className="mt-1">
                    <div
                      className={cn('h-1 rounded-full mx-auto', todayDay ? 'bg-white/60' : 'bg-[#6B3FA0]/40')}
                      style={{ width: `${Math.min(100, dayAppts.length * 25)}%` }}
                    />
                    <p className={cn('text-xs mt-0.5', todayDay ? 'text-white/80' : 'text-slate-400')}>
                      {dayAppts.length}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="faltou">Faltou</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {professionals.length > 0 && (
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {professionals.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-sm text-slate-500" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {view === 'day' ? (
        <div className="space-y-2">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map(appt => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onTest={handleTest}
                hasConflict={conflictIds.has(appt.id)}
              />
            ))
          ) : (
            <Card className="p-12 border-0 shadow-sm">
              <div className="text-center text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="font-medium">Nenhum agendamento para este período</p>
                <Button
                  className="mt-4 bg-[#6B3FA0] hover:bg-[#834CB8]"
                  onClick={() => { setSelectedAppointment(null); setFormOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </Button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
            if (dayAppts.length === 0) return null;
            return (
              <div key={dateStr}>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => { setCurrentDate(day); setView('day'); }}
                    className={cn(
                      'text-sm font-semibold px-2 py-1 rounded transition-colors',
                      isToday(day) ? 'bg-[#6B3FA0] text-white' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </button>
                  <span className="text-xs text-slate-400">({dayAppts.length} agend.)</span>
                </div>
                <div className="space-y-1.5">
                  {dayAppts.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      onTest={handleTest}
                      hasConflict={conflictIds.has(appt.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {filteredAppointments.length === 0 && (
            <Card className="p-12 border-0 shadow-sm">
              <div className="text-center text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum agendamento nesta semana</p>
              </div>
            </Card>
          )}
        </div>
      )}

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agendamento de "{appointmentToDelete?.client_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}