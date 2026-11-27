import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, Receipt, CheckCircle2 } from 'lucide-react';

const BRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function XmlUploadCard({ nota, parsing, onXml, onClear }) {
  const inputRef = useRef(null);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onXml(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">XML da nota fiscal</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          A nota informa o valor de compra, ICMS e IPI de cada aparelho.
        </p>
      </div>

      {!nota && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 hover:border-[#6B3FA0] hover:bg-[#6B3FA0]/5 rounded-xl px-4 py-8 flex flex-col items-center gap-2 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center">
              {parsing ? (
                <Loader2 className="h-6 w-6 text-[#6B3FA0] animate-spin" />
              ) : (
                <FileUp className="h-6 w-6 text-[#6B3FA0]" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-700">
              {parsing ? 'Lendo nota fiscal...' : 'Toque para enviar o XML'}
            </p>
            <p className="text-xs text-slate-400">Arquivo .xml da NF-e</p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}

      {nota && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">NF {nota.number || '—'}</p>
              <p className="text-xs text-emerald-700 truncate">{nota.emitter || 'Emitente não identificado'}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {nota.items?.length || 0} item(ns) • Total {BRL(nota.total)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear} className="text-emerald-700">
              Trocar
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {nota.items?.map((item, index) => (
              <div key={`${item.code}-${index}`} className="p-3 flex items-start gap-2">
                <Receipt className="h-3.5 w-3.5 text-slate-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {item.code} — {item.description}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.quantity} un • {BRL(item.unit_price)} un • ICMS {BRL(item.icms)} • IPI {BRL(item.ipi)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}