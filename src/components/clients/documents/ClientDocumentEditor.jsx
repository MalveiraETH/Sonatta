import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import DocumentRichEditor from '@/components/documents/DocumentRichEditor';

export default function ClientDocumentEditor({
  open,
  onOpenChange,
  initialTitle,
  initialContent,
  templateName,
  saving,
  onSave,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialTitle || '');
      setContent(initialContent || '');
    }
  }, [open, initialTitle, initialContent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ? title : 'Documento do paciente'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Nome do documento</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do documento"
              className="bg-white"
            />
            {templateName && (
              <p className="text-xs text-slate-400">Modelo: {templateName}</p>
            )}
          </div>

          <DocumentRichEditor value={content} onChange={setContent} />

          <p className="text-xs text-slate-400">
            Edite o conteúdo livremente. Você pode inserir variáveis dinâmicas e tabelas; elas são
            preenchidas com os dados do paciente ao salvar.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave({ title, content })}
            disabled={saving}
            className="bg-[#6B3FA0] hover:bg-[#5a3490] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar documento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}