import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Edit, Trash2, ChevronDown, ChevronUp, User, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import MedicalRecordForm from './MedicalRecordForm';
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

const recordTypeConfig = {
  consulta:  { label: 'Consulta',    color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700' },
  retorno:   { label: 'Retorno',     color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
  avaliacao: { label: 'Avaliação',   color: 'bg-purple-500',  light: 'bg-purple-50 text-purple-700' },
  ajuste:    { label: 'Ajuste',      color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700' },
  exame:     { label: 'Exame',       color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700' },
  outros:    { label: 'Outros',      color: 'bg-slate-400',   light: 'bg-slate-100 text-slate-600' }
};

function RecordCard({ record, onEdit, onDelete, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const config = recordTypeConfig[record.record_type] || recordTypeConfig.outros;

  return (
    <div className="flex gap-4">
      {/* Linha vertical + bolinha */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-4 ${config.color}`} />
        <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Cabeçalho */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.light}`}>
                {config.label}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {format(new Date(record.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              {record.professional_name && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                  <User className="h-3 w-3" />
                  {record.professional_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:text-[#6B3FA0]"
                onClick={e => { e.stopPropagation(); onEdit(record); }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {currentUser?.role === 'admin' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                  onClick={e => { e.stopPropagation(); onDelete(record); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </div>
          </div>

          {/* Queixa principal (sempre visível) */}
          {record.chief_complaint && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Queixa principal</p>
              <p className="text-sm text-slate-700">{record.chief_complaint}</p>
            </div>
          )}

          {/* Conteúdo expandido */}
          {expanded && (
            <div className="px-4 py-3 space-y-3 border-t border-slate-100">
              {record.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Evolução / Anotações</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{record.notes}</p>
                </div>
              )}
              {record.audiogram_notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Observações Audiológicas</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{record.audiogram_notes}</p>
                </div>
              )}
              {record.next_steps && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Próximos Passos</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{record.next_steps}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MedicalRecordsTimeline({ clientId, clientName }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadRecords();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [clientId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MedicalRecord.filter({ client_id: clientId }, '-date');
      setRecords(data);
    } catch (e) {
      toast.error('Erro ao carregar prontuários');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      await base44.entities.MedicalRecord.delete(deleteTarget.id);
      toast.success('Prontuário excluído');
      setDeleteTarget(null);
      loadRecords();
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleFormClose = (open) => {
    setFormOpen(open);
    if (!open) setEditingRecord(null);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Prontuários
        </CardTitle>
        <Button size="sm" onClick={() => { setEditingRecord(null); setFormOpen(true); }} className="bg-[#6B3FA0] hover:bg-[#834CB8]">
          <Plus className="h-4 w-4 mr-1" />
          Novo Registro
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-200" />
            <p>Nenhum prontuário registrado</p>
            <p className="text-sm">Clique em "Novo Registro" para adicionar o primeiro atendimento</p>
          </div>
        ) : (
          <div className="mt-2">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                currentUser={currentUser}
              />
            ))}
            {/* Fim da timeline */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-slate-200 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-400 pb-2 pt-1">Início do histórico</p>
            </div>
          </div>
        )}
      </CardContent>

      <MedicalRecordForm
        open={formOpen}
        onOpenChange={handleFormClose}
        clientId={clientId}
        clientName={clientName}
        record={editingRecord}
        onSuccess={loadRecords}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Prontuário</AlertDialogTitle>
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