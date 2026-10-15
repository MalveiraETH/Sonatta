import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'sonner';
import TemplateToolbar from '@/components/settings/modelos/TemplateToolbar';
import TableEditorDialog from '@/components/settings/modelos/TableEditorDialog';
import { patchTablesToEmbeds, serializeTable } from '@/lib/docTable';
import {
  DOC_QUILL_MODULES,
  DOC_QUILL_FORMATS,
  DOC_EDITOR_STYLES,
  registerDocBlots,
} from '@/lib/docEditorSetup';

registerDocBlots();
const Quill = ReactQuill.Quill;

// Editor rico reutilizável para os documentos do paciente: negrito, títulos,
// listas, tabelas do Sonatta e variáveis dinâmicas.
export default function DocumentRichEditor({ value, onChange, readOnly = false }) {
  const quillRef = useRef(null);
  const [tableDialog, setTableDialog] = useState({ open: false, index: null, data: '' });

  const insertVariable = (token) => {
    const quill = quillRef.current?.getEditor();
    if (!quill || readOnly) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : Math.max(0, quill.getLength() - 1);
    const text = `${token} `;
    quill.insertText(index, text, { docvar: true }, 'user');
    quill.setSelection(index + text.length, 0);
  };

  const handleEditorClick = (e) => {
    if (readOnly) return;
    const embed = e.target.closest?.('.doc-table-embed');
    if (!embed) return;
    const quill = quillRef.current?.getEditor();
    const blot = quill ? Quill.find(embed) : null;
    if (!quill || !blot) return;
    setTableDialog({
      open: true,
      index: quill.getIndex(blot),
      data: blot.domNode.getAttribute('data-rows') || '',
    });
  };

  const handleConfirmTable = (data) => {
    const quill = quillRef.current?.getEditor();
    const serialized = serializeTable(data);
    if (quill) {
      if (tableDialog.index != null) {
        quill.deleteText(tableDialog.index, 1, 'user');
        quill.insertEmbed(tableDialog.index, 'doctable', serialized, 'user');
        quill.setSelection(tableDialog.index + 1, 0);
      } else {
        const range = quill.getSelection(true);
        const index = range ? range.index : Math.max(0, quill.getLength() - 1);
        quill.insertEmbed(index, 'doctable', serialized, 'user');
        quill.insertText(index + 1, '\n', 'user');
        quill.setSelection(index + 2, 0);
      }
    }
    setTableDialog({ open: false, index: null, data: '' });
  };

  const handleEditorPaste = (e) => {
    if (readOnly) return;
    const html = e.clipboardData?.getData('text/html') || '';
    const patched = patchTablesToEmbeds(html);
    if (patched === html) return;

    const quill = quillRef.current?.getEditor();
    const range = quill?.getSelection(true);
    if (!quill || !range) return;

    e.preventDefault();
    if (range.length) quill.deleteText(range.index, range.length, 'user');
    quill.clipboard.dangerouslyPasteHTML(range.index, patched, 'user');
    toast.success('Tabela colada no documento');
  };

  return (
    <>
      <style>{DOC_EDITOR_STYLES}</style>
      <div className="doc-editor">
        <TemplateToolbar
          onInsertVariable={insertVariable}
          variablesDisabled={readOnly}
          onInsertTable={() => setTableDialog({ open: true, index: null, data: '' })}
          tableDisabled={readOnly}
        />
        <div onClick={handleEditorClick} onPasteCapture={handleEditorPaste}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            modules={DOC_QUILL_MODULES}
            formats={DOC_QUILL_FORMATS}
            readOnly={readOnly}
            placeholder="Insira aqui o conteúdo do documento..."
          />
        </div>
      </div>

      <TableEditorDialog
        open={tableDialog.open}
        data={tableDialog.data}
        onOpenChange={(open) => setTableDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmTable}
      />
    </>
  );
}