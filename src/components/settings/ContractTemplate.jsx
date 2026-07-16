import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'align',
];

const DEFAULT_TEMPLATE = `CONTRATO DE COMPROMISSO DE PAGAMENTO

VENDEDOR:
Sonatta - Aparelhos Auditivos Manaus
CNPJ: 33.457.952/0001-98
Endereço: Edifício Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Adrianópolis, Manaus – AM, 69057-035

COMPRADOR:
Nome: {{client_name}}
CPF: {{client_cpf}}
Endereço: {{client_address}}

As partes acima identificadas têm, entre si, justo e contratado o seguinte:

OBJETO
O presente contrato tem por objeto a venda de {{products_list}} ao COMPRADOR, nas condições estipuladas abaixo.

VALOR
O valor total da aquisição é de {{total_value}}, a serem pagos parceladamente.

FORMA DE PAGAMENTO
O pagamento será feito conforme as condições abaixo:
Quantidade de parcelas: {{installments_count}}
Valor de cada parcela: {{installment_value}}
Vencimento: todo dia {{payment_day}} de cada mês, iniciando em {{first_payment_date}}
Forma de pagamento: exclusivamente via Pix, para a chave Pix 33457952000198, em nome de Sonatta - Aparelhos Auditivos Manaus (CNPJ: 33.457.952/0001-98).

OBRIGAÇÕES DAS PARTES

Do COMPRADOR:
• Realizar o pagamento das parcelas nas datas acordadas, exclusivamente via Pix para a chave supra indicada;
• Enviar o comprovante de cada pagamento efetuado.

Da VENDEDORA (Sonatta):
• Entregar os aparelhos auditivos objeto deste contrato;
• Disponibilizar recibos mediante solicitação.

INADIMPLEMENTO
O pagamento em atraso acarretará multa de 5% sobre o valor da parcela, acrescido de juros de 5% ao mês.

DISPOSIÇÕES FINAIS
Este contrato só poderá ser alterado por escrito e de comum acordo entre as partes.
Fica eleito o foro da comarca de Manaus/AM para dirimir eventuais conflitos.

Por estarem assim justas e contratadas, assinam este instrumento em duas vias de igual teor.

Manaus, {{contract_date}}


___________________________________
SONATTA - APARELHOS AUDITIVOS
CNPJ: 33.457.952/0001-98


___________________________________
{{client_name}}
CPF: {{client_cpf}}`;

export default function ContractTemplate() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [template, setTemplate] = useState(null);
  // Se o template salvo for texto puro (sem tags HTML), converte para HTML básico
  const toHtml = (text) => {
    if (!text) return '';
    if (text.includes('<') && text.includes('>')) return text;
    return text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
  };
  const [templateText, setTemplateText] = useState(toHtml(DEFAULT_TEMPLATE));
  const [footerInfo, setFooterInfo] = useState({
    phone: '(92) 99169-2102',
    email: 'contato@sonatta.com.br',
    website: 'www.sonatta.com.br',
    instagram: '@sonatta.manaus'
  });
  const [headerInfo, setHeaderInfo] = useState({
    title: 'CONTRATO DE COMPROMISSO DE PAGAMENTO',
    logo_url: ''
  });
  const [headerOpen, setHeaderOpen] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.ContractTemplate.subscribe((event) => {
      if (event.type === 'update' && event.data.name === 'PIX Parcelado') {
        setTemplateText(toHtml(event.data.template_text));
        if (event.data.footer_info) setFooterInfo(event.data.footer_info);
        if (event.data.header_info) setHeaderInfo(prev => ({ ...prev, ...event.data.header_info }));
      }
    });
    return () => unsubscribe();
  }, []);

  const loadTemplate = async () => {
    try {
      const [templates, user] = await Promise.all([
        base44.entities.ContractTemplate.filter({ name: 'PIX Parcelado' }),
        base44.auth.me()
      ]);
      setCurrentUser(user);
      if (templates.length > 0) {
        setTemplate(templates[0]);
        setTemplateText(toHtml(templates[0].template_text));
        if (templates[0].footer_info) setFooterInfo(templates[0].footer_info);
        if (templates[0].header_info) setHeaderInfo({ ...headerInfo, ...templates[0].header_info });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (currentUser?.role !== 'admin') {
      toast.error('Apenas administradores podem alterar estas configurações');
      return;
    }
    setSaving(true);
    try {
      const dataToSave = {
        template_text: templateText,
        footer_info: footerInfo,
        header_info: headerInfo
      };

      if (template) {
        await base44.entities.ContractTemplate.update(template.id, dataToSave);
      } else {
        await base44.entities.ContractTemplate.create({
          name: 'PIX Parcelado',
          ...dataToSave,
          is_active: true
        });
      }
      toast.success('Template salvo com sucesso!');
      loadTemplate();
    } catch (error) {
      toast.error('Erro ao salvar template');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6B3FA0]" />
              <CardTitle>Modelo de Contrato - PIX Parcelado</CardTitle>
            </div>
            {!isAdmin && (
              <p className="text-sm text-red-600">Somente visualização - Apenas administradores podem editar</p>
            )}
          </div>
          {isAdmin && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6B3FA0] hover:bg-[#834CB8]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Template
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cabeçalho do PDF */}
        <Card className="p-0 bg-white border border-slate-200">
          <button
            type="button"
            onClick={() => setHeaderOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="font-semibold text-[#6B3FA0]">Cabeçalho do PDF</p>
              <p className="text-xs text-slate-500">Logo e título do documento</p>
            </div>
            {headerOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {headerOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Título do documento</label>
                <Input
                  value={headerInfo.title}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, title: e.target.value })}
                  placeholder="CONTRATO DE COMPROMISSO DE PAGAMENTO"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">URL da logo</label>
                <p className="text-xs text-slate-400">Cole a URL pública da imagem (PNG/JPG)</p>
                <Input
                  value={headerInfo.logo_url}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, logo_url: e.target.value })}
                  placeholder="https://..."
                  disabled={!isAdmin}
                />
              </div>
              {headerInfo.logo_url && (
                <img
                  src={headerInfo.logo_url}
                  alt="Logo"
                  className="h-14 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          )}
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-2">Variáveis Disponíveis:</p>
          <div className="grid grid-cols-2 gap-2 text-blue-700">
            <code>{'{{client_name}}'}</code>
            <code>{'{{client_cpf}}'}</code>
            <code>{'{{client_address}}'}</code>
            <code>{'{{products_list}}'}</code>
            <code>{'{{total_value}}'}</code>
            <code>{'{{installments_count}}'}</code>
            <code>{'{{installment_value}}'}</code>
            <code>{'{{payment_day}}'}</code>
            <code>{'{{first_payment_date}}'}</code>
            <code>{'{{contract_date}}'}</code>
          </div>
        </div>
        
        <div className={`rounded-lg border border-slate-200 overflow-hidden ${!isAdmin ? 'pointer-events-none opacity-60' : ''}`}>
          <ReactQuill
            theme="snow"
            value={templateText}
            onChange={setTemplateText}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            placeholder="Digite o texto do contrato..."
            style={{ minHeight: '420px' }}
          />
        </div>

        <Card className="p-4 bg-slate-50">
          <h3 className="font-semibold text-slate-800 mb-4">Informações do Rodapé (PDF)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Telefone</label>
              <Input
                value={footerInfo.phone}
                onChange={(e) => setFooterInfo({ ...footerInfo, phone: e.target.value })}
                placeholder="(92) 99169-2102"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">E-mail</label>
              <Input
                value={footerInfo.email}
                onChange={(e) => setFooterInfo({ ...footerInfo, email: e.target.value })}
                placeholder="contato@sonatta.com.br"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Website</label>
              <Input
                value={footerInfo.website}
                onChange={(e) => setFooterInfo({ ...footerInfo, website: e.target.value })}
                placeholder="www.sonatta.com.br"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600">Instagram</label>
              <Input
                value={footerInfo.instagram}
                onChange={(e) => setFooterInfo({ ...footerInfo, instagram: e.target.value })}
                placeholder="@sonatta.manaus"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </Card>
      </CardContent>
    </Card>
  );
}