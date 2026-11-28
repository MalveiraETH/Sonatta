import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';

export default function ImageUploadCard({ images, onAdd, onRemove, onAnalyze, analyzing }) {
  const inputRef = useRef(null);

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) onAdd(files);
    event.target.value = '';
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Fotos dos produtos</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Envie uma ou várias fotos das etiquetas. O agente lê nome, REF e nº de série (SN) de cada
          caixa e vincula a série ao item da nota.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-slate-300 hover:border-[#6B3FA0] hover:bg-[#6B3FA0]/5 rounded-xl px-4 py-8 flex flex-col items-center gap-2 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center">
          <ImagePlus className="h-6 w-6 text-[#6B3FA0]" />
        </div>
        <p className="text-sm font-medium text-slate-700">Toque para enviar as fotos</p>
        <p className="text-xs text-slate-400">JPG ou PNG • várias imagens por vez</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
              <img src={image.preview} alt={image.file.name} className="w-full h-20 sm:h-24 object-cover" />
              <button
                type="button"
                onClick={() => onRemove(image.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={onAnalyze}
        disabled={!images.length || analyzing}
        className="w-full bg-[#6B3FA0] hover:bg-[#834CB8]"
      >
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analisando imagens...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Analisar {images.length || ''} foto{images.length === 1 ? '' : 's'}
          </>
        )}
      </Button>
      {analyzing && (
        <p className="text-xs text-center text-slate-500">
          Lendo etiquetas, referências, números de série e códigos.
        </p>
      )}
    </Card>
  );
}