import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, StickyNote, Edit, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ObservationForm from './ObservationForm';
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

const categoryConfig = {
  recepcao:       { label: 'Recepção',         color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700' },
  comercial:      { label: 'Comercial',        color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
  queixa_cliente: { label: 'Queixa do Cliente', color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700' },
  agendamento:    { label: 'Agendamento',      color: 'bg-purple-500',  light: 'bg-purple-50 text-purple-700' },
  outros:         { label: 'Outros',           color: 'bg-slate-400',   light: 'bg-slate-100 text-slate-600' }
};

function ObservationCard({ observation, onEdit, onDelete, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[observation.category] || categoryConfig.outros;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-4 ${config.color}`} />
        <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
      </div>

      <div className="flex-1 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${config.light}`}>
                {config.label}
              </span>
              {observation.subject && (
                <span className="text-sm font-medium text-slate-700 truncate">
                  {observation.subject}
                </span>
              )}
              <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                {format(new Date(observation.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:text-[#6B3FA0]"
                onClick={e => { e.stopPropagation(); onEdit(observation); }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {currentUser?.role === 'admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                  onClick={e => { e.stopPropagation(); onDelete(observation); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </div>
          </div>

          {/* Autor + data (mobile) sempre visível */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs text-slate-500">
              {format(new Date(observation.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            {observation.author_name && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <User className="h-3 w-3" />
                {observation.author_name}
              </span>
            )}
          </div>

          {/* Conteúdo */}
          {expanded && observation.content && (
            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-700 whitespace-pre-line">{observation.content}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ObservationsTimeline({ clientId, clientName }) {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadObservations();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [clientId]);

  const loadObservations = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ClientObservation.filter({ client_id: clientId }, '-date');
      setObservations(data);
    } catch (e) {
      toast.error('Erro ao carregar observações');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (observation) => {
    setEditing(observation);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      await base44.entities.ClientObservation.delete(deleteTarget.id);
      toast.success('Observação excluída');
      setDeleteTarget(null);
      loadObservations();
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleFormClose = (open) => {
    setFormOpen(open);
    if (!open) setEditing(null);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Observações
        </CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
          <Plus className="h-4 w-4 mr-1" />
          Novo Registro
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <StickyNote className="h-10 w-10 mx-auto text-slate-200" />
            <p>Nenhuma observação registrada</p>
            <p className="text-sm">Clique em "Novo Registro" para adicionar uma observação</p>
          </div>
        ) : (
          <div className="mt-2">
            {observations.map((observation) => (
              <ObservationCard
                key={observation.id}
                observation={observation}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                currentUser={currentUser}
              />
            ))}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-200 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-400 pb-2 pt-1">Início do histórico</p>
            </div>
          </div>
        )}
      </CardContent>

      <ObservationForm
        open={formOpen}
        onOpenChange={handleFormClose}
        clientId={clientId}
        clientName={clientName}
        observation={editing}
        onSuccess={loadObservations}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Observação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}