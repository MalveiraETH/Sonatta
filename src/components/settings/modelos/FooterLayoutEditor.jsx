import React from 'react';
import LayoutTextField from './LayoutTextField';

export default function FooterLayoutEditor({ text, onTextChange, canEdit }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Rodapé</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Duas colunas: a da esquerda com a contagem automática de páginas e a da direita para o
          texto.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-stretch">
        {/* Coluna da contagem de páginas */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Contagem automática
          </p>
          <p className="text-lg font-semibold text-slate-700 mt-1">Página 1/1</p>
        </div>

        {/* Coluna do texto */}
        <LayoutTextField
          value={text}
          onChange={onTextChange}
          readOnly={!canEdit}
          placeholder="Texto do rodapé (telefone, e-mail, redes sociais...)"
        />
      </div>

      {/* Barra verde (cor da logo do app) */}
      <div className="h-[10px] w-full bg-[#A4D233]" />
    </div>
  );
}