import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const SETTING_KEY = 'quote_pdf_config';

const DEFAULT = {
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
  document_title: 'PROPOSTA COMERCIAL',
  validity_days: 30,
  company_name: 'Sonatta – Soluções Auditivas',
  cnpj: '33.457.952/0001-98',
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  phone: '(92) 98464-5343',
  email: 'atendimento@sonatta.store',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
  table_col_desc: 'Descrição',
  table_col_qty: 'Qtd',
  table_col_unit: 'Valor Unit.',
  table_col_total: 'Total',
  payment_label_cash: 'À VISTA  (Dinheiro ou PIX)',
  payment_label_card: 'PARCELADO  (Cartão de Crédito)',
  payment_installments: 18,
  payment_installments_label: 'Parcelamento em até {n}×',
  warranty_text: '<h3><strong>Garantia de Fábrica</strong></h3><p>Cobre defeitos de fabricação conforme padrão do fabricante (reparos ou substituição de componentes com falhas de origem fabril, mediante uso conforme normas técnicas).</p><p><br></p><h3><strong>Garantia de Adaptação</strong></h3><p>Acompanhamento técnico inicial para ajustes finos e suporte à adaptação, assegurando o ganho auditivo conforme as necessidades clínicas do paciente.</p>',
  vip_text: '<p>Todas as revisões abaixo são <strong>TOTALMENTE GRATUITAS</strong> para clientes Sonatta:</p><p><br></p><ul><li>1ª Revisão — 3 meses após a compra</li><li>2ª Revisão — 9 meses após a compra</li><li>Revisões Subsequentes — A cada 12 meses (anualmente)</li></ul><p><br></p><p>Caso detecte qualquer dificuldade fora dos períodos programados, o cliente pode agendar consulta extra — também coberta pelo atendimento Sonatta.</p>',
  signer_name: 'Fabio Malveira',
  signer_role: 'Comercial Sonatta',
};

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px'];
const LINE_HEIGHTS = ['1', '1.2', '1.5', '1.8', '2', '2.5', '3'];

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ size: FONT_SIZES }],
    [{ lineheight: LINE_HEIGHTS }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['bold', 'italic', 'underline', 'size', 'lineheight', 'list', 'bullet', 'header'];

function Section({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <span className="font-semibold text-[#6B3FA0] text-base">{title}</span>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-6 pb-6 space-y-4 border-t border-slate-100">{children}</div>}
    </section>
  );
}

function Field({ label, hint, id, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function RichField({ label, hint, value, onChange }) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-sm font-medium text-slate-700">{label}</Label>}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="border border-slate-200 rounded-md overflow-hidden quill-compact">
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
        />
      </div>
    </div>
  );
}

export default function QuotePDFSettings() {
  const [config, setConfig] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AppSettings.list();
      const rec = all.find((r) => r.setting_key === SETTING_KEY);
      if (rec) { setRecordId(rec.id); setConfig({ ...DEFAULT, ...rec.setting_value }); }
    } catch (e) {
      toast.error('Erro ao carregar configurações');
    }
    setLoading(false);
  };

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      if (recordId) {
        await base44.entities.AppSettings.update(recordId, { setting_value: config });
      } else {
        const all = await base44.entities.AppSettings.list();
        const existing = all.find((r) => r.setting_key === SETTING_KEY);
        if (existing) {
          await base44.entities.AppSettings.update(existing.id, { setting_value: config });
          setRecordId(existing.id);
        } else {
          const rec = await base44.entities.AppSettings.create({
            setting_key: SETTING_KEY,
            description: 'Configurações do PDF de Orçamento',
            setting_value: config,
          });
          setRecordId(rec.id);
        }
      }
      toast.success('Configurações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .quill-compact .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          padding: 6px 8px;
          background: #f8fafc;
        }
        .quill-compact .ql-container {
          border: none;
          font-size: 14px;
          min-height: 80px;
        }
        .quill-compact .ql-editor {
          min-height: 80px;
          padding: 8px 12px;
        }
      `}</style>

      <div className="space-y-5 max-w-3xl">

        {/* ── CABEÇALHO ── */}
        <Section title="Cabeçalho do PDF" subtitle="Logo, título do documento e validade">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Título do documento" id="document_title">
              <Input id="document_title" value={config.document_title} onChange={(e) => set('document_title', e.target.value)} />
            </Field>
            <Field label="Validade padrão (dias)" id="validity_days">
              <Input id="validity_days" type="number" min={1} value={config.validity_days} onChange={(e) => set('validity_days', Number(e.target.value))} />
            </Field>
          </div>
          <Field label="URL da logo" id="logo_url" hint="Cole a URL pública da imagem (PNG/JPG)">
            <Input id="logo_url" value={config.logo_url} onChange={(e) => set('logo_url', e.target.value)} />
          </Field>
          {config.logo_url && (
            <img src={config.logo_url} alt="Preview logo" className="h-14 object-contain rounded border border-slate-100 p-1" />
          )}
        </Section>

        {/* ── EMPRESA ── */}
        <Section title="Dados da Empresa" subtitle="Exibidos no cabeçalho e rodapé">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da empresa" id="company_name">
              <Input id="company_name" value={config.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </Field>
            <Field label="CNPJ" id="cnpj">
              <Input id="cnpj" value={config.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            </Field>
          </div>
          <Field label="Endereço (rodapé)" id="address">
            <Input id="address" value={config.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </Section>

        {/* ── CONTATO ── */}
        <Section title="Rodapé — Contato" subtitle="Telefone, e-mail, website e Instagram">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Telefone" id="phone">
              <Input id="phone" value={config.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="E-mail" id="email">
              <Input id="email" value={config.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Website" id="website">
              <Input id="website" value={config.website} onChange={(e) => set('website', e.target.value)} />
            </Field>
            <Field label="Instagram" id="instagram">
              <Input id="instagram" value={config.instagram} onChange={(e) => set('instagram', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── TABELA ── */}
        <Section title="Tabela de Itens" subtitle="Rótulos das colunas" defaultOpen={false}>
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Descrição" id="table_col_desc">
              <Input id="table_col_desc" value={config.table_col_desc} onChange={(e) => set('table_col_desc', e.target.value)} />
            </Field>
            <Field label="Qtd" id="table_col_qty">
              <Input id="table_col_qty" value={config.table_col_qty} onChange={(e) => set('table_col_qty', e.target.value)} />
            </Field>
            <Field label="Valor Unit." id="table_col_unit">
              <Input id="table_col_unit" value={config.table_col_unit} onChange={(e) => set('table_col_unit', e.target.value)} />
            </Field>
            <Field label="Total" id="table_col_total">
              <Input id="table_col_total" value={config.table_col_total} onChange={(e) => set('table_col_total', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── FINANCEIRO ── */}
        <Section title="Resumo Financeiro" subtitle="Títulos dos boxes de pagamento" defaultOpen={false}>
          <div className="pt-4 space-y-4">
            <Field label="Título box À Vista" id="payment_label_cash">
              <Input id="payment_label_cash" value={config.payment_label_cash} onChange={(e) => set('payment_label_cash', e.target.value)} />
            </Field>
            <Field label="Título box Parcelado" id="payment_label_card">
              <Input id="payment_label_card" value={config.payment_label_card} onChange={(e) => set('payment_label_card', e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Número máximo de parcelas" id="payment_installments">
                <Input id="payment_installments" type="number" min={1} max={60} value={config.payment_installments} onChange={(e) => set('payment_installments', Number(e.target.value))} />
              </Field>
              <Field label="Rótulo do parcelamento" id="payment_installments_label" hint='Use {n} para o número de parcelas'>
                <Input id="payment_installments_label" value={config.payment_installments_label} onChange={(e) => set('payment_installments_label', e.target.value)} />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── GARANTIA ── */}
        <Section title="Prazos de Garantia" subtitle="Use o editor para formatar títulos, negrito, tamanho e espaçamento">
          <div className="pt-4">
            <RichField
              hint='Inclua os subtítulos "Garantia de Fábrica" e "Garantia de Adaptação" diretamente no texto'
              value={config.warranty_text}
              onChange={(v) => set('warranty_text', v)}
            />
          </div>
        </Section>

        {/* ── VIP ── */}
        <Section title="Acompanhamento VIP Vitalício" subtitle="Use o editor para formatar títulos, listas e espaçamento">
          <div className="pt-4">
            <RichField
              hint='Inclua itens de revisão como lista e textos complementares diretamente no editor'
              value={config.vip_text}
              onChange={(v) => set('vip_text', v)}
            />
          </div>
        </Section>

        {/* ── ASSINATURA ── */}
        <Section title="Assinatura" subtitle="Nome e cargo no rodapé do documento" defaultOpen={false}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome" id="signer_name">
              <Input id="signer_name" value={config.signer_name} onChange={(e) => set('signer_name', e.target.value)} />
            </Field>
            <Field label="Cargo / Descrição" id="signer_role">
              <Input id="signer_role" value={config.signer_role} onChange={(e) => set('signer_role', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#6B3FA0] hover:bg-[#5a3385] text-white w-full sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar configurações
        </Button>
      </div>
    </>
  );
}