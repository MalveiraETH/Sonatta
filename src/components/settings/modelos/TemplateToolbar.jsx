import React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Table,
  Underline,
} from 'lucide-react';
import TemplateVariablesMenu from './TemplateVariablesMenu';

// As classes ql-* são reconhecidas pelo Quill (container #doc-template-toolbar);
// o valor de cada botão define o formato aplicado.
const btn =
  'flex items-center justify-center h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100 transition-colors';

const headerBtn =
  'ql-header flex items-center justify-center h-8 min-w-8 px-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors';

export default function TemplateToolbar({
  onInsertVariable,
  variablesDisabled,
  onInsertTable,
  tableDisabled,
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border border-slate-200 border-b-0 rounded-t-xl bg-white px-2 py-1.5">
      <div id="doc-template-toolbar" className="flex flex-wrap items-center gap-0.5">
        <button type="button" className={headerBtn} value="1">H1</button>
        <button type="button" className={headerBtn} value="2">H2</button>
        <button type="button" className={headerBtn} value="3">H3</button>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <button type="button" className={`ql-bold ${btn}`} title="Negrito">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-italic ${btn}`} title="Itálico">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-underline ${btn}`} title="Sublinhado">
          <Underline className="h-4 w-4" />
        </button>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <button type="button" className={`ql-align ${btn}`} value="" title="Alinhar à esquerda">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-align ${btn}`} value="center" title="Centralizar">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-align ${btn}`} value="right" title="Alinhar à direita">
          <AlignRight className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-align ${btn}`} value="justify" title="Justificar">
          <AlignJustify className="h-4 w-4" />
        </button>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <button type="button" className={`ql-list ${btn}`} value="ordered" title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-list ${btn}`} value="bullet" title="Lista com marcadores">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={`ql-list ${btn}`} value="check" title="Lista de verificação">
          <ListChecks className="h-4 w-4" />
        </button>
      </div>

      <span className="w-px h-5 bg-slate-200 mx-1" />

      <button
        type="button"
        onClick={onInsertTable}
        disabled={tableDisabled}
        title="Inserir tabela"
        className={`${btn} disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <Table className="h-4 w-4" />
      </button>

      <span className="w-px h-5 bg-slate-200 mx-1" />

      <TemplateVariablesMenu onInsert={onInsertVariable} disabled={variablesDisabled} />
    </div>
  );
}