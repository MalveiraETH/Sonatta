import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import LayoutTextField from './LayoutTextField';

export default function HeaderLayoutEditor({
  imageUrl,
  onImageChange,
  text,
  onTextChange,
  canEdit,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      if (!res?.file_url) throw new Error('Falha no envio da imagem');
      onImageChange(res.file_url);
      toast.success('Imagem adicionada ao cabeçalho');
    } catch (err) {
      toast.error('Não foi possível enviar a imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Cabeçalho</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Duas colunas: a da esquerda para a imagem (logo) e a da direita para o texto.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-stretch">
        {/* Coluna da imagem */}
        <div
          className={
            imageUrl
              ? 'rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center gap-2'
              : 'rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 flex flex-col items-center justify-center gap-2 min-h-[120px]'
          }
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Imagem do cabeçalho"
                className="max-h-24 max-w-full object-contain"
              />
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onImageChange('')}
                    className="text-slate-500"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remover
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-slate-400" />
              <p className="text-xs text-slate-500 text-center">Imagem do cabeçalho</p>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Inserir imagem
                </Button>
              )}
            </>
          )}
        </div>

        {/* Coluna do texto */}
        <LayoutTextField
          value={text}
          onChange={onTextChange}
          readOnly={!canEdit}
          placeholder="Texto do cabeçalho (nome da clínica, CNPJ, endereço...)"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}