import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import TemplateToolbar from './TemplateToolbar';
import TableEditorDialog from './TableEditorDialog';
import {
  parseTableValue,
  patchTablesToEmbeds,
  renderTableHtml,
  serializeTable,
} from '@/lib/docTable';

// Blot de variável: mantém o token {{ variavel }} destacado no editor
// e preserva o destaque ao salvar/reabrir o modelo.
const Quill = ReactQuill.Quill;
if (Quill) {
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

    // O Quill não tem tabela nativa: ela entra como bloco atômico com as
    // linhas guardadas em JSON e é editada pelo diálogo (clique na tabela).
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
}

const QUILL_MODULES = { toolbar: { container: '#doc-template-toolbar' } };
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'align', 'list', 'docvar', 'doctable'];

const CATEGORY_LABEL = { documento: 'Documento', prontuario: 'Prontuário' };

export default function DocumentTemplateEditor({ template, category, canEdit, onBack, onSaved }) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [isActive, setIsActive] = useState(template?.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [tableDialog, setTableDialog] = useState({ open: false, index: null, data: '' });
  const quillRef = useRef(null);

  const categoryLabel = CATEGORY_LABEL[category] || 'Documento';

  const insertVariable = (token) => {
    const quill = quillRef.current?.getEditor();
    if (!quill || !canEdit) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : Math.max(0, quill.getLength() - 1);
    const text = `${token} `;
    quill.insertText(index, text, { docvar: true }, 'user');
    quill.setSelection(index + text.length, 0);
  };

  // Clique em uma tabela do documento abre o editor de linhas e colunas
  const handleEditorClick = (e) => {
    if (!canEdit) return;
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
    const value = serializeTable(data);
    if (quill) {
      if (tableDialog.index != null) {
        quill.deleteText(tableDialog.index, 1, 'user');
        quill.insertEmbed(tableDialog.index, 'doctable', value, 'user');
        quill.setSelection(tableDialog.index + 1, 0);
      } else {
        const range = quill.getSelection(true);
        const index = range ? range.index : Math.max(0, quill.getLength() - 1);
        quill.insertEmbed(index, 'doctable', value, 'user');
        quill.insertText(index + 1, '\n', 'user');
        quill.setSelection(index + 2, 0);
      }
    }
    setTableDialog({ open: false, index: null, data: '' });
  };

  // Tabelas coladas (Excel, Word, páginas e outros documentos) entram como
  // tabelas do Sonatta, em vez de texto achatado
  const handleEditorPaste = (e) => {
    if (!canEdit) return;
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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do modelo');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('salvarModeloDocumento', {
        action: 'save',
        template: {
          id: template?.id,
          name: name.trim(),
          category,
          content,
          is_active: isActive,
        },
      });
      if (res?.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success('Modelo salvo com sucesso!');
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erro ao salvar o modelo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#6B3FA0] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Modelos <span className="text-slate-300">/</span> {categoryLabel}
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 break-words">
            {name || `Novo modelo de ${categoryLabel}`}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Monte o conteúdo e insira as variáveis que serão preenchidas com os dados do cliente.
          </p>
        </div>
        {canEdit ? (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900 font-semibold flex-shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar alterações
          </Button>
        ) : (
          <p className="text-sm text-slate-500">Somente visualização</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nome do modelo</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Nome do modelo de ${categoryLabel}`}
            disabled={!canEdit}
            className="bg-white"
          />
        </div>
        <div className="flex items-center gap-2 lg:pb-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} disabled={!canEdit} />
          <span className="text-sm text-slate-600">Modelo ativo</span>
        </div>
      </div>

      <style>{`
        .doc-editor .ql-toolbar.ql-snow {
          border: none;
          background: transparent;
          padding: 0;
        }
        .doc-editor .ql-toolbar.ql-snow button {
          height: 32px;
          width: 32px;
          padding: 4px;
          border-radius: 6px;
          color: #475569;
        }
        .doc-editor .ql-toolbar.ql-snow button.ql-header {
          width: auto;
          min-width: 32px;
          font-size: 11px;
          font-weight: 600;
        }
        .doc-editor .ql-toolbar.ql-snow button:hover {
          background: #f1f5f9;
        }
        .doc-editor .ql-toolbar.ql-snow button.ql-active {
          background: #EDE9FE;
          color: #6B3FA0;
        }
        .doc-editor .ql-toolbar.ql-snow button svg {
          width: 15px;
          height: 15px;
          float: none;
        }
        .doc-editor .ql-container.ql-snow {
          border: 1px solid #e2e8f0;
          border-radius: 0 0 12px 12px;
          background: #fff;
          font-family: 'Helvetica', 'Arial', sans-serif;
        }
        .doc-editor .ql-editor {
          min-height: 420px;
          padding: 28px 32px;
          font-size: 15px;
          line-height: 1.7;
          color: #1f2937;
        }
        .doc-editor .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
        }
        .doc-editor .ql-editor .doc-var {
          background: #EDE9FE;
          color: #6B3FA0;
          border: 1px dashed #A78BFA;
          border-radius: 4px;
          padding: 0 4px;
          font-weight: 600;
          white-space: nowrap;
        }
        .doc-editor .ql-editor .doc-table-embed {
          margin: 10px 0;
          cursor: pointer;
        }
        .doc-editor .ql-editor .doc-table-embed:hover {
          outline: 2px dashed #A4D233;
          outline-offset: 2px;
        }
        .doc-editor .ql-editor table {
          border-collapse: collapse;
          width: 100%;
        }
        .doc-editor .ql-editor table th,
        .doc-editor .ql-editor table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          font-size: 14px;
        }
        .doc-editor .ql-editor h1 { font-size: 1.6em; font-weight: 700; }
        .doc-editor .ql-editor h2 { font-size: 1.3em; font-weight: 700; }
        .doc-editor .ql-editor h3 { font-size: 1.1em; font-weight: 700; }
      `}</style>

      <div className="doc-editor">
        <TemplateToolbar
          onInsertVariable={insertVariable}
          variablesDisabled={!canEdit}
          onInsertTable={() => setTableDialog({ open: true, index: null, data: '' })}
          tableDisabled={!canEdit}
        />
        <div onClick={handleEditorClick} onPasteCapture={handleEditorPaste}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={(html) => setContent(html)}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            readOnly={!canEdit}
            placeholder="Insira aqui o conteúdo..."
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Clique em uma tabela do documento para editar as células. Você também pode colar tabelas
          do Excel, do Word ou de outros documentos.
        </p>
      </div>

      <TableEditorDialog
        open={tableDialog.open}
        data={tableDialog.data}
        onOpenChange={(open) => setTableDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmTable}
      />
    </div>
  );
}