import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/usePermissions';
import DocumentTemplateList from './DocumentTemplateList';
import DocumentTemplateEditor from './DocumentTemplateEditor';

const CATEGORIES = [
  { key: 'documento', label: 'Documentos' },
  { key: 'prontuario', label: 'Prontuários' },
];

export default function ModelosSettings() {
  const [user, setUser] = useState(null);
  const { can, loading: permissionsLoading } = usePermissions(user);
  const [category, setCategory] = useState('documento');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';
  const permsReady = !!user && (isAdmin || !permissionsLoading);
  const canView = isAdmin || can('Modelos', 'Ver página');
  const canEdit = isAdmin || can('Modelos', 'Criar/Editar modelos');
  const canDelete = isAdmin || can('Modelos', 'Excluir modelos');

  useEffect(() => {
    if (!permsReady || editorOpen) return;
    let active = true;
    setLoading(true);
    base44.entities.DocumentTemplate.filter(
      { category },
      { sort: 'name', limit: 200 }
    )
      .then((res) => {
        if (active) setTemplates(res.items || []);
      })
      .catch(() => {
        if (active) {
          setTemplates([]);
          toast.error('Erro ao carregar os modelos');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, editorOpen, reloadKey, permsReady]);

  const openEditor = (template) => {
    setEditorTemplate(template);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const handleDelete = async (template) => {
    try {
      const res = await base44.functions.invoke('salvarModeloDocumento', {
        action: 'delete',
        template: { id: template.id },
      });
      if (res?.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success('Modelo excluído');
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erro ao excluir o modelo');
    }
  };

  if (!permsReady) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
        <Shield className="h-10 w-10 text-slate-300" />
        <p className="text-base font-medium">Acesso não autorizado</p>
        <p className="text-sm text-center">Você não tem permissão para acessar os modelos.</p>
      </div>
    );
  }

  if (editorOpen) {
    return (
      <DocumentTemplateEditor
        key={editorKey}
        template={editorTemplate}
        category={category}
        canEdit={canEdit}
        onBack={() => setEditorOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6B3FA0]" />
            Modelos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crie modelos de Documentos e Prontuários com variáveis dinâmicas preenchidas depois
            com os dados do cliente.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => openEditor(null)}
            className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900 font-semibold flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar novo
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              category === c.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <DocumentTemplateList
        templates={templates}
        loading={loading}
        canDelete={canDelete}
        onOpen={openEditor}
        onDelete={handleDelete}
        emptyLabel={CATEGORIES.find((c) => c.key === category)?.label || 'Documentos'}
      />
    </div>
  );
}