import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MODULES = {
  toolbar: [['bold', 'italic', 'underline'], [{ align: [] }], ['image'], ['clean']],
};

export default function HeaderFooterEditor({ label, description, value, onChange, canEdit }) {
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // O botão de imagem do editor envia o arquivo para o app e insere o link
  useEffect(() => {
    const toolbar = quillRef.current?.getEditor()?.getModule('toolbar');
    toolbar?.addHandler('image', () => fileInputRef.current?.click());
  }, []);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      const url = res?.file_url;
      const quill = quillRef.current?.getEditor();
      if (!url || !quill) throw new Error('Falha no envio da imagem');

      const range = quill.getSelection(true);
      const index = range ? range.index : Math.max(0, quill.getLength() - 1);
      quill.insertEmbed(index, 'image', url, 'user');
      quill.setSelection(index + 1, 0);
      toast.success('Imagem inserida');
    } catch (err) {
      toast.error('Não foi possível inserir a imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Inserir imagem
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImage}
      />

      <div className="doc-layout-editor">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={MODULES}
          readOnly={!canEdit}
          placeholder={`Conteúdo do ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}