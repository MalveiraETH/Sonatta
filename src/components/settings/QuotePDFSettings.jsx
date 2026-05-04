import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

const SETTING_KEY = 'quote_pdf_config';

const DEFAULT = {
  // Empresa
  company_name: 'Sonatta – Soluções Auditivas',
  cnpj: '33.457.952/0001-98',
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  // Contato
  phone: '(92) 98464-5343',
  email: 'atendimento@casacaracol.com.br',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
  // Documento
  validity_days: 30,
  document_title: 'PROPOSTA COMERCIAL',
  // Assinatura
  signer_name: 'Fabio Malveira',
  signer_role: 'Comercial Sonatta',
  // Condições comerciais (uma por linha)
  conditions: [
    'Parcelamento em até 18× no cartão de crédito',
    'Pagamento à vista (Dinheiro ou PIX) com desconto incluso na proposta',
    'PIX Parcelado: condições a combinar',
    'Garantia: 2 a 4 anos conforme fabricante',
    'Validade desta proposta: {validity_days} dias',
  ].join('\n'),
  warranty_factory: 'Cobre defeitos de fabricação conforme padrão do fabricante (reparos ou substituição de componentes com falhas de origem fabril, mediante uso conforme normas técnicas).',
  warranty_adaptation: 'Acompanhamento técnico inicial para ajustes finos e suporte à adaptação, assegurando o ganho auditivo conforme as necessidades clínicas do paciente.',
  vip_intro: 'Todas as revisões abaixo são TOTALMENTE GRATUITAS para clientes Sonatta:',
  vip_extra: 'Caso detecte qualquer dificuldade fora dos períodos programados, o cliente pode agendar consulta extra — também coberta pelo atendimento Sonatta.',
  // Logo
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
};

export default function QuotePDFSettings() {
  const [config, setConfig] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AppSettings.list();
      const rec = all.find((r) => r.setting_key === SETTING_KEY);
      if (rec) {
        setRecordId(rec.id);
        setConfig({ ...DEFAULT, ...rec.setting_value });
      }
    } catch (e) {
      console.error('Erro ao carregar config PDF:', e);
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
        // Double-check: reload to avoid duplicate creation
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
      toast.success('Configurações salvas! Todos os orçamentos gerados usarão estas configurações.');
    } catch (e) {
      console.error('Erro ao salvar config PDF:', e);
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

  const Field = ({ label, id, children }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Empresa */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Dados da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </section>

      {/* Contato */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Contato (Rodapé)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </section>

      {/* Documento */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Documento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título do documento" id="document_title">
            <Input id="document_title" value={config.document_title} onChange={(e) => set('document_title', e.target.value)} />
          </Field>
          <Field label="Validade padrão (dias)" id="validity_days">
            <Input id="validity_days" type="number" min={1} value={config.validity_days} onChange={(e) => set('validity_days', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="URL da logo" id="logo_url">
          <Input id="logo_url" value={config.logo_url} onChange={(e) => set('logo_url', e.target.value)} />
        </Field>
        {config.logo_url && (
          <img src={config.logo_url} alt="Preview logo" className="h-12 object-contain mt-1" />
        )}
      </section>

      {/* Condições Comerciais — info only */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Condições Comerciais</h3>
        <p className="text-xs text-slate-500">As condições comerciais abaixo são fixas no PDF do orçamento.</p>
        <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
          <li>Parcelamento em até 18× no cartão de crédito</li>
          <li>Pagamento à vista (Dinheiro ou PIX) com desconto incluso na proposta</li>
          <li>PIX Parcelado: condições a combinar</li>
          <li>Garantia: 2 a 4 anos conforme fabricante</li>
          <li>Validade desta proposta: {config.validity_days} dias</li>
        </ul>
      </section>

      {/* Garantia */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Prazos de Garantia</h3>
        <Field label="Garantia de Fábrica" id="warranty_factory">
          <Textarea id="warranty_factory" rows={3} value={config.warranty_factory} onChange={(e) => set('warranty_factory', e.target.value)} className="text-sm" />
        </Field>
        <Field label="Garantia de Adaptação" id="warranty_adaptation">
          <Textarea id="warranty_adaptation" rows={3} value={config.warranty_adaptation} onChange={(e) => set('warranty_adaptation', e.target.value)} className="text-sm" />
        </Field>
      </section>

      {/* Acompanhamento VIP */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Acompanhamento VIP Vitalício</h3>
        <p className="text-xs text-slate-500">As datas das revisões (3, 9 e 12 meses) são fixas. Edite apenas os textos introdutório e de rodapé.</p>
        <Field label="Texto introdutório" id="vip_intro">
          <Textarea id="vip_intro" rows={2} value={config.vip_intro} onChange={(e) => set('vip_intro', e.target.value)} className="text-sm" />
        </Field>
        <Field label="Texto complementar (consultas extras)" id="vip_extra">
          <Textarea id="vip_extra" rows={2} value={config.vip_extra} onChange={(e) => set('vip_extra', e.target.value)} className="text-sm" />
        </Field>
      </section>

      {/* Assinatura */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#6B3FA0] text-base border-b border-slate-100 pb-2">Assinatura</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome" id="signer_name">
            <Input id="signer_name" value={config.signer_name} onChange={(e) => set('signer_name', e.target.value)} />
          </Field>
          <Field label="Cargo / Descrição" id="signer_role">
            <Input id="signer_role" value={config.signer_role} onChange={(e) => set('signer_role', e.target.value)} />
          </Field>
        </div>
      </section>

      <Button
        onClick={save}
        disabled={saving}
        className="bg-[#6B3FA0] hover:bg-[#5a3385] text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar configurações
      </Button>
    </div>
  );
}