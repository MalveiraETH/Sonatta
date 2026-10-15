// Configuração compartilhada do editor de documentos (Quill).
// Registra os blots de variável dinâmica e de tabela atômica do Sonatta.
import ReactQuill from 'react-quill-new';
import { parseTableValue, renderTableHtml, serializeTable } from '@/lib/docTable';

export const DOC_QUILL_MODULES = { toolbar: { container: '#doc-template-toolbar' } };
export const DOC_QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'align',
  'list',
  'docvar',
  'doctable',
];

let registered = false;

export function registerDocBlots() {
  if (registered) return;
  const Quill = ReactQuill.Quill;
  if (!Quill) return;

  try {
    const Inline = Quill.import('blots/inline');
    class DocVarBlot extends Inline {
      static blotName = 'docvar';
      static tagName = 'span';
      static className = 'doc-var';
    }
    Quill.register(DocVarBlot, true);
  } catch (e) {
    /* já registrado */
  }

  try {
    const BlockEmbed = Quill.import('blots/block/embed');
    class DocTableBlot extends BlockEmbed {
      static blotName = 'doctable';
      static tagName = 'div';
      static className = 'doc-table-embed';

      static create(value) {
        const node = super.create();
        const data = parseTableValue(value);
        node.setAttribute('data-rows', serializeTable(data));
        node.setAttribute('contenteditable', 'false');
        node.innerHTML = renderTableHtml(data);
        return node;
      }

      static value(node) {
        return node.getAttribute('data-rows') || '';
      }
    }
    Quill.register(DocTableBlot, true);
  } catch (e) {
    /* já registrado */
  }

  registered = true;
}

// Estilos visuais do editor (destaca variáveis e tabelas dentro do conteúdo).
export const DOC_EDITOR_STYLES = `
  .doc-editor .ql-toolbar.ql-snow { border: none; background: transparent; padding: 0; }
  .doc-editor .ql-toolbar.ql-snow button { height: 32px; width: 32px; padding: 4px; border-radius: 6px; color: #475569; }
  .doc-editor .ql-toolbar.ql-snow button.ql-header { width: auto; min-width: 32px; font-size: 11px; font-weight: 600; }
  .doc-editor .ql-toolbar.ql-snow button:hover { background: #f1f5f9; }
  .doc-editor .ql-toolbar.ql-snow button.ql-active { background: #EDE9FE; color: #6B3FA0; }
  .doc-editor .ql-toolbar.ql-snow button svg { width: 15px; height: 15px; float: none; }
  .doc-editor .ql-container.ql-snow { border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; background: #fff; font-family: 'Helvetica', 'Arial', sans-serif; }
  .doc-editor .ql-editor { min-height: 380px; padding: 28px 32px; font-size: 15px; line-height: 1.7; color: #1f2937; }
  .doc-editor .ql-editor.ql-blank::before { color: #94a3b8; font-style: normal; }
  .doc-editor .ql-editor .doc-var { background: #EDE9FE; color: #6B3FA0; border: 1px dashed #A78BFA; border-radius: 4px; padding: 0 4px; font-weight: 600; white-space: nowrap; }
  .doc-editor .ql-editor .doc-table-embed { margin: 10px 0; cursor: pointer; }
  .doc-editor .ql-editor .doc-table-embed:hover { outline: 2px dashed #A4D233; outline-offset: 2px; }
  .doc-editor .ql-editor table { border-collapse: collapse; width: 100%; }
  .doc-editor .ql-editor table th, .doc-editor .ql-editor table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 14px; }
  .doc-editor .ql-editor h1 { font-size: 1.6em; font-weight: 700; }
  .doc-editor .ql-editor h2 { font-size: 1.3em; font-weight: 700; }
  .doc-editor .ql-editor h3 { font-size: 1.1em; font-weight: 700; }
`;