import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import DocumentTemplatePicker from './DocumentTemplatePicker';
import ClientDocumentEditor from './ClientDocumentEditor';
import ClientDocumentRow from './ClientDocumentRow';
import { loadDocumentContext, fillDocumentVariables } from '@/lib/fillDocumentVariables';

export default function ClientDocumentsTab({ client }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [client?.id]);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const loadDocuments = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const res = await base44.entities.ClientDocument.filter(
        { client_id: client.id },
        { sort: '-created_date', limit: 200 }
      );
      setDocuments(res.items || []);
    } catch (e) {
      toast.error('Erro ao carregar os documentos');
    } finally {
      setLoading(false);
    }
  };

  const handlePickTemplate = async (template) => {
    setPickerOpen(false);
    try {
      const ctx = await loadDocumentContext({ client, user: currentUser });
      setEditor({
        document: null,
        template,
        title: template.name || 'Documento',
        content: fillDocumentVariables(template.content || '', ctx),
        ctx,
      });
    } catch (e) {
      toast.error('Não foi possível preparar o documento');
    }
  };

  const handleOpen = async (document) => {
    let ctx = {};
    try {
      ctx = await loadDocumentContext({ client, user: currentUser });
    } catch (e) {
      ctx = {};
    }
    setEditor({
      document,
      template: null,
      title: document.title || '',
      // Relê as variáveis com os dados atuais do paciente ao reabrir.
      content: fillDocumentVariables(document.content || '', ctx),
      ctx,
    });
  };

  const handleSave = async ({ title, content }) => {
    if (!title.trim()) {
      toast.error('Informe o nome do documento');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: client.id,
        client_name: client.full_name,
        title: title.trim(),
        content: fillDocumentVariables(content, editor.ctx || {}),
        updated_by_name: currentUser?.full_name || '',
      };

      if (editor.document?.id) {
        await base44.entities.ClientDocument.update(editor.document.id, payload);
      } else {
        await base44.entities.ClientDocument.create({
          ...payload,
          template_id: editor.template?.id || '',
          template_name: editor.template?.name || '',
          created_by_name: currentUser?.full_name || '',
        });
      }

      toast.success('Documento salvo');
      setEditor(null);
      loadDocuments();
    } catch (e) {
      toast.error('Erro ao salvar o documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.ClientDocument.delete(deleteTarget.id);
      toast.success('Documento excluído');
      setDeleteTarget(null);
      loadDocuments();
    } catch (e) {
      toast.error('Erro ao excluir o documento');
    }
  };

  const canDelete = currentUser?.role === 'admin';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="bg-[#6B3FA0] hover:bg-[#834CB8]"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Documento
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#6B3FA0]/30 border-t-[#6B3FA0] rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-200" />
            <p>Nenhum documento gerado</p>
            <p className="text-sm">Clique em "Novo Documento" e escolha um modelo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <ClientDocumentRow
                key={doc.id}
                document={doc}
                client={client}
                canDelete={canDelete}
                onOpen={() => handleOpen(doc)}
                onDelete={() => setDeleteTarget(doc)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <DocumentTemplatePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickTemplate}
      />

      <ClientDocumentEditor
        open={!!editor}
        onOpenChange={(open) => !open && setEditor(null)}
        initialTitle={editor?.title}
        initialContent={editor?.content}
        templateName={editor?.template?.name}
        saving={saving}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.title}"? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}