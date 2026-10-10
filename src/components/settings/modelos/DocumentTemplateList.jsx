import React from 'react';
import { ChevronRight, FileText, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function DocumentTemplateList({
  templates,
  loading,
  canDelete,
  onOpen,
  onDelete,
  emptyLabel,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center bg-white border border-dashed border-slate-200 rounded-xl">
        <FileText className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">Nenhum modelo em {emptyLabel} ainda.</p>
        <p className="text-xs text-slate-400">Use "Criar novo" para montar o primeiro.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
      {templates.map((template) => (
        <div key={template.id} className="group flex items-center hover:bg-slate-50 transition-colors">
          <button
            type="button"
            onClick={() => onOpen(template)}
            className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5 text-left min-w-0"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-slate-700 truncate">{template.name}</span>
              {template.is_active === false && (
                <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  Inativo
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
          </button>

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  title="Excluir modelo"
                  className="mr-3 p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O modelo "{template.name}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(template)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  );
}