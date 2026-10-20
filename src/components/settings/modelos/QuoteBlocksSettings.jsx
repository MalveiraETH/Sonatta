import React, { useEffect, useState } from 'react';
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
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
  loadQuoteBlocks,
  saveQuoteBlocks,
} from '@/lib/quoteBlocks';

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ header: [1, 2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['bold', 'italic', 'underline', 'header', 'list'];

function RichField({ label, hint, value, onChange, disabled }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          readOnly={disabled}
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
    setBlocks((prev) => ({ ...(prev || {}), [category]: { ...current, [key]: value } }));

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
        .quote-blocks-editor .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 6px 8px; }
        .quote-blocks-editor .ql-container.ql-snow { border: none; font-size: 14px; }
        .quote-blocks-editor .ql-editor { min-height: 110px; padding: 8px 12px; }
      `}</style>

      <div className="flex items-start gap-2">
        <ShieldCheck className="h-5 w-5 text-[#6B3FA0] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800">Garantia e acompanhamento por categoria</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Esses textos entram no orçamento conforme a categoria dos produtos escolhidos. Se a
            categoria não tiver texto próprio, o bloco Padrão é usado.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label className="text-sm font-medium text-slate-700">Categoria</Label>
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
          label="Prazos de garantia"
          hint="Título e condições de garantia exibidos na seção de garantia do orçamento"
          value={current.warranty_text}
          onChange={(v) => setField('warranty_text', v)}
          disabled={!canEdit}
        />
        <RichField
          label="Acompanhamento vitalício"
          hint="Revisões e benefícios inclusos no acompanhamento"
          value={current.followup_text}
          onChange={(v) => setField('followup_text', v)}
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