import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, FileText, Loader2 } from 'lucide-react';

const CATEGORY_LABEL = { documento: 'Documento', prontuario: 'Prontuário' };

export default function DocumentTemplatePicker({ open, onOpenChange, onPick }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    base44.entities.DocumentTemplate.filter({}, { sort: 'name', limit: 200 })
      .then((res) => {
        if (active) setTemplates((res.items || []).filter((t) => t.is_active !== false));
      })
      .catch(() => {
        if (active) setTemplates([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolher modelo de documento</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-200" />
            <p>Nenhum modelo ativo cadastrado</p>
            <p className="text-sm">Cadastre os modelos em Configurações → Modelos.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onPick(template)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-700 truncate">
                    {template.name}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {CATEGORY_LABEL[template.category] || 'Documento'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}