import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Save,
  ShieldCheck,
  Underline,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
  loadQuoteBlocks,
  saveQuoteBlocks,
} from '@/lib/quoteBlocks';

// Formatos que o PDF do orçamento sabe desenhar
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'list'];

// Barra de ferramentas no mesmo padrão do editor de modelos (Modelos > Documentos)
const btn =
  'flex items-center justify-center h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100 transition-colors';
const headerBtn =
  'ql-header flex items-center justify-center h-8 min-w-8 px-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors';

function BlockToolbar({ id }) {
  return (
    <div
      id={id}
      className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1.5"
    >
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

      <button type="button" className={`ql-list ${btn}`} value="ordered" title="Lista numerada">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={`ql-list ${btn}`} value="bullet" title="Lista com marcadores">
        <List className="h-4 w-4" />
      </button>

      <span className="w-px h-5 bg-slate-200 mx-1" />

      <button type="button" className={`ql-clean ${btn}`} title="Limpar formatação">
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
}

function RichField({ fieldId, label, hint, value, onChange, disabled }) {
  const modules = useMemo(() => ({ toolbar: { container: `#${fieldId}` } }), [fieldId]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <BlockToolbar id={fieldId} />
        <ReactQuill
          theme="snow"
          defaultValue={value || ''}
          onChange={onChange}
          modules={modules}
          formats={QUILL_FORMATS}
          readOnly={disabled}
          placeholder="Escreva o texto do bloco..."
        />
      </div>
    </div>
  );
}

export default function QuoteBlocksSettings({ canEdit }) {
  const [blocks, setBlocks] = useState(null);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuoteBlocks().then(setBlocks);
  }, []);

  const current = blocks?.[category] || { warranty_text: '', followup_text: '' };
  const setField = (key, value) =>
    setBlocks((prev) => {
      const base = prev?.[category] || { warranty_text: '', followup_text: '' };
      return { ...(prev || {}), [category]: { ...base, [key]: value } };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveQuoteBlocks(blocks);
      toast.success('Blocos do orçamento salvos');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!blocks) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <style>{`
        .quote-blocks-editor .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e2e8f0; background: #fff; padding: 6px 8px; }
        .quote-blocks-editor .ql-toolbar.ql-snow button { height: 32px; width: 32px; padding: 4px; border-radius: 6px; color: #475569; }
        .quote-blocks-editor .ql-toolbar.ql-snow button.ql-header { width: auto; min-width: 32px; font-size: 11px; font-weight: 600; }
        .quote-blocks-editor .ql-toolbar.ql-snow button:hover { background: #f1f5f9; }
        .quote-blocks-editor .ql-toolbar.ql-snow button.ql-active { background: #EDE9FE; color: #6B3FA0; }
        .quote-blocks-editor .ql-toolbar.ql-snow button svg { width: 15px; height: 15px; float: none; }
        .quote-blocks-editor .ql-container.ql-snow { border: none; font-family: 'Helvetica', 'Arial', sans-serif; font-size: 14px; }
        .quote-blocks-editor .ql-editor { min-height: 110px; padding: 10px 12px; line-height: 1.6; color: #1f2937; }
        .quote-blocks-editor .ql-editor.ql-blank::before { color: #94a3b8; font-style: normal; }
        .quote-blocks-editor .ql-editor h1 { font-size: 1.6em; font-weight: 700; }
        .quote-blocks-editor .ql-editor h2 { font-size: 1.3em; font-weight: 700; }
        .quote-blocks-editor .ql-editor h3 { font-size: 1.1em; font-weight: 700; }
      `}</style>

      <div className="flex items-start gap-2">
        <ShieldCheck className="h-5 w-5 text-[#6B3FA0] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800">Sonatta Garantias e Benefícios por categoria</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Esses textos entram no orçamento conforme a categoria de markup dos produtos escolhidos
            (as mesmas de Produtos de Referência: 90, 70, 50, 30, 10, 5). Se a categoria não tiver
            texto próprio, o bloco Padrão é usado.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label className="text-sm font-medium text-slate-700">Nível de cuidado (categoria)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="quote-blocks-editor space-y-4">
        <RichField
          key={`warranty-${category}`}
          fieldId="quote-block-warranty"
          label="Sonatta Garantias e Benefícios"
          hint="Título e condições exibidos no bloco de garantias e benefícios do orçamento"
          value={current.warranty_text}
          onChange={(v) => setField('warranty_text', v)}
          disabled={!canEdit}
        />
      </div>

      {canEdit && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900 font-semibold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar blocos
        </Button>
      )}
    </div>
  );
}