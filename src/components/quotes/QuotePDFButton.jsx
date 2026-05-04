import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { base44 } from '@/api/base44Client';

const DEFAULT_CFG = {
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
  document_title: 'PROPOSTA COMERCIAL',
  validity_days: 30,
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  phone: '(92) 98464-5343',
  email: 'atendimento@sonatta.store',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
  signer_name: 'Fabio Malveira',
  signer_role: 'Comercial Sonatta',
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
};

// ── Palette ──────────────────────────────────────────────────────────────────
const P = {
  purple:   [98,  42, 126],
  green:    [136, 188,  7],
  textMain: [32,  31,  28],
  textSub:  [66,  63,  51],
  white:    [255, 255, 255],
  pageBg:   [255, 255, 255],
  divider:  [220, 214, 230],
};

const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (raw) => {
  if (!raw) return '—';
  try {
    const s = String(raw);
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  } catch { return '—'; }
};

const loadB64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

async function loadCfg() {
  try {
    const all = await base44.entities.AppSettings.list();
    const rec = all.find((r) => r.setting_key === 'quote_pdf_config');
    if (rec && rec.setting_value) return { ...DEFAULT_CFG, ...rec.setting_value };
  } catch (e) {
    console.warn('Usando config padrão do PDF:', e.message);
  }
  return DEFAULT_CFG;
}

async function buildPDF(quote, cfg) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  const PAGE_W = 210, PAGE_H = 297, ML = 14, MR = 14;
  const CW = PAGE_W - ML - MR;

  // ── Espaçamentos e tipografia ──
  const LH       = 4.5;  // line-height base (8pt)
  const SH       = 5;    // altura cabeçalho de seção
  const SEC_GAP  = 4;    // espaço entre seções
  const HEAD_PAD = 3;    // espaço após cabeçalho de seção
  const PARA_GAP = 2;    // espaço entre parágrafos
  const FOOTER_H = 18;   // altura reservada pro footer
  const BOTTOM_MARGIN = PAGE_H - FOOTER_H - 8; // limite seguro de conteúdo

  // ── Helpers ──
  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setTxt    = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };

  let Y = 0;
  const updateY = (amount) => { Y += amount; };

  setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── HEADER ──
  const LOGO_MAX_H = 16, LOGO_MAX_W = 50;
  const logoB64 = await loadB64(cfg.logo_url);
  if (logoB64) {
    const tmpImg = new Image();
    await new Promise((r) => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = logoB64; });
    const ratio = tmpImg.naturalWidth / tmpImg.naturalHeight;
    let lw = LOGO_MAX_H * ratio, lh = LOGO_MAX_H;
    if (lw > LOGO_MAX_W) { lw = LOGO_MAX_W; lh = lw / ratio; }
    doc.addImage(logoB64, 'PNG', ML, 5, lw, lh, undefined, 'NONE');
  } else {
    setFont('bold', 16); setTxt(P.purple); doc.text('SONATTA', ML, 18);
  }

  const RX = PAGE_W - MR;
  const validDays = quote.validity_days || cfg.validity_days || 30;
  const vd = new Date(); vd.setDate(vd.getDate() + validDays);
  const validUntil = String(vd.getDate()).padStart(2,'0') + '/' + String(vd.getMonth()+1).padStart(2,'0') + '/' + vd.getFullYear();

  setFont('bold', 12); setTxt(P.purple);
  doc.text(cfg.document_title || 'PROPOSTA COMERCIAL', RX, 9, { align: 'right' });
  setFont('normal', 7); setTxt(P.textSub);
  doc.text('Nº ' + (quote.quote_number || '—'), RX, 14, { align: 'right' });
  doc.text('Data: ' + fmtDate(quote.created_date), RX, 18, { align: 'right' });
  doc.text('Válida até: ' + validUntil, RX, 22, { align: 'right' });

  setFill(P.green); doc.rect(ML, 27, CW, 0.7, 'F');
  Y = 32;

  // ── Helper: cabeçalho de seção ──
  const sectionHead = (label) => {
    setFill([246, 241, 251]); doc.rect(ML, Y, CW, SH, 'F');
    setFill(P.purple); doc.rect(ML, Y, 2.5, SH, 'F');
    setFont('bold', 8.5); setTxt(P.purple);
    doc.text(label, ML + 5, Y + 3.6);
    updateY(SH + HEAD_PAD);
  };

  // ── SECTION 1 — CLIENTE ──
  sectionHead('DADOS DO CLIENTE');

  // Layout fixo: label em col A, valor em col B (evita desalinhamento)
  const C1 = { lbl: ML + 2,       val: ML + 22 };
  const C2 = { lbl: ML + CW/2 + 2, val: ML + CW/2 + 22 };
  const HALF_VAL_W = CW/2 - 24;

  [
    [['Nome', quote.client_name || '—'], ['CPF', quote.client_cpf || '—']],
    [['Telefone', quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
  ].forEach(([left, right], i) => {
    if (i > 0) updateY(1);
    setFont('bold', 7); setTxt(P.textSub);
    doc.text(left[0] + ':', C1.lbl, Y);
    doc.text(right[0] + ':', C2.lbl, Y);
    setFont('normal', 8); setTxt(P.textMain);
    doc.text(doc.splitTextToSize(String(left[1]), HALF_VAL_W)[0], C1.val, Y);
    doc.text(doc.splitTextToSize(String(right[1]), HALF_VAL_W)[0], C2.val, Y);
    updateY(LH + 0.5);
  });
  updateY(1);
  setFill(P.divider); doc.rect(ML, Y, CW, 0.2, 'F');
  updateY(SEC_GAP);

  // ── SECTION 2 — ITENS ──
  sectionHead('ITENS DO ORÇAMENTO');
  const TC = { desc: { x: ML, w: 100 }, qty: { x: ML+102, w: 14 }, unit: { x: ML+118, w: 28 } };
  const TR = PAGE_W - MR, TH = 6;

  const drawTableHeader = (sy) => {
    setFill(P.purple); doc.rect(ML, sy, CW, TH, 'F');
    setFont('bold', 7.5); setTxt(P.white);
    doc.text('Descrição', TC.desc.x + 3, sy + 4.2);
    doc.text('Qtd', TC.qty.x + TC.qty.w/2, sy + 4.2, { align: 'center' });
    doc.text('Valor Unit.', TC.unit.x + TC.unit.w - 1, sy + 4.2, { align: 'right' });
    doc.text('Total', TR - 2, sy + 4.2, { align: 'right' });
    return sy + TH;
  };

  Y = drawTableHeader(Y);
  let zebra = false;
  (quote.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 4);
    const rowH = Math.max(6, nameLines.length * LH + 2);
    if (zebra) { setFill([245,243,248]); doc.rect(ML,Y,CW,rowH,'F'); }
    setFont('normal', 8); setTxt(P.textMain);
    doc.text(nameLines, TC.desc.x + 3, Y + 4.2);
    doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w/2, Y + 4.2, { align: 'center' });
    doc.text(BRL(item.unit_price), TC.unit.x + TC.unit.w - 1, Y + 4.2, { align: 'right' });
    doc.text(BRL(item.total), TR - 2, Y + 4.2, { align: 'right' });
    setFill([220,215,230]); doc.rect(ML, Y + rowH - 0.2, CW, 0.2, 'F');
    Y += rowH; zebra = !zebra;
  });
  setFill(P.purple); doc.rect(ML, Y, CW, 0.35, 'F');
  updateY(SEC_GAP);

  // ── SECTION 3 — RESUMO FINANCEIRO ──
  const hasDsc = (quote.discount || 0) > 0;
  const totalAVista = quote.total;
  const inst18 = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;
  const OPT_W = CW/2 - 3, OPT_X1 = ML, OPT_X2 = ML + OPT_W + 6;
  const OPT_HEAD_H = 6;
  const INNER_PAD = 3;
  const ROW_H = LH + 1.5;
  const DIV_GAP = 2;
  const VAL_H   = 6;
  const BOT_PAD = 3;
  // Altura dinâmica real baseada nas linhas de cada box
  const rowsA = 1 + (hasDsc ? 1 : 0);
  const OPT_BODY_H_A = INNER_PAD + rowsA * ROW_H + DIV_GAP + VAL_H + BOT_PAD;
  const OPT_BODY_H_B = INNER_PAD + 2 * ROW_H + DIV_GAP + VAL_H + BOT_PAD;
  const OPT_BODY_H = Math.max(OPT_BODY_H_A, OPT_BODY_H_B);
  const OPT_H = OPT_HEAD_H + OPT_BODY_H;

  // Box A — À Vista
  setFill(P.green); doc.roundedRect(OPT_X1, Y, OPT_W, OPT_HEAD_H, 1.2, 1.2, 'F');
  setFont('bold', 8); setTxt(P.white);
  doc.text('À VISTA  (Dinheiro ou PIX)', OPT_X1 + OPT_W/2, Y + 4.2, { align: 'center' });
  setFill([250,252,243]); setStroke([180,210,60]); doc.setLineWidth(0.3);
  doc.roundedRect(OPT_X1, Y + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.2, 1.2, 'FD');
  const AX = OPT_X1 + OPT_W - 4; let AY = Y + OPT_HEAD_H + INNER_PAD;
  setFont('normal', 7); setTxt(P.textSub); doc.text('Subtotal:', OPT_X1 + 4, AY);
  setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), AX, AY, { align: 'right' });
  AY += ROW_H;
  if (hasDsc) {
    const pct = quote.subtotal > 0 ? ((quote.discount/quote.subtotal)*100).toFixed(1)+'%' : '';
    setFont('normal', 7); setTxt(P.textSub); doc.text('Desconto '+(pct?'('+pct+')':'')+':',OPT_X1+4,AY);
    setFont('bold', 8); setTxt([70,130,0]); doc.text('- '+BRL(quote.discount),AX,AY,{align:'right'});
    AY += ROW_H;
  }
  setFill([180,210,60]); doc.rect(OPT_X1+3, AY + 1, OPT_W-6, 0.25, 'F');
  AY += DIV_GAP + 4;
  setFont('bold', 11); setTxt([50,100,0]); doc.text(BRL(totalAVista), OPT_X1+OPT_W/2, AY, { align: 'center' });

  // Box B — Parcelado
  setFill(P.purple); doc.roundedRect(OPT_X2, Y, OPT_W, OPT_HEAD_H, 1.2, 1.2, 'F');
  setFont('bold', 8); setTxt(P.white);
  doc.text('PARCELADO  (Cartão de Crédito)', OPT_X2+OPT_W/2, Y+4.2, { align: 'center' });
  setFill([250,247,254]); setStroke([210,200,225]); doc.setLineWidth(0.3);
  doc.roundedRect(OPT_X2, Y + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.2, 1.2, 'FD');
  const BX = OPT_X2+OPT_W-4; let BY = Y + OPT_HEAD_H + INNER_PAD;
  setFont('normal', 7); setTxt(P.textSub); doc.text('Valor total:', OPT_X2+4, BY);
  setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), BX, BY, { align: 'right' });
  BY += ROW_H;
  setFont('normal', 7); setTxt(P.textSub); doc.text('Parcelamento em até 18×:', OPT_X2+4, BY);
  setFill([210,200,225]); doc.rect(OPT_X2+3, BY + ROW_H + 1, OPT_W-6, 0.25, 'F');
  BY += ROW_H + DIV_GAP + 4;
  setFont('bold', 11); setTxt(P.purple); doc.text(BRL(inst18)+'/mês', OPT_X2+OPT_W/2, BY, { align: 'center' });

  updateY(OPT_H + SEC_GAP);

  // ── Observações ──
  if (quote.notes) {
    setFont('bold', 7); setTxt(P.purple); doc.text('Observações:', ML, Y); updateY(LH);
    setFont('normal', 8); setTxt(P.textMain);
    const obs = doc.splitTextToSize(quote.notes, CW);
    doc.text(obs, ML, Y); updateY(obs.length * LH + PARA_GAP);
  }

  // ── SECTION 4 — GARANTIA ──
  updateY(2);
  sectionHead('PRAZOS DE GARANTIA');

  setFont('bold', 7); setTxt(P.purple); doc.text('Garantia de Fábrica:', ML + 2, Y); updateY(LH + 0.5);
  setFont('normal', 8); setTxt(P.textMain);
  const gfLines = doc.splitTextToSize(cfg.warranty_factory || DEFAULT_CFG.warranty_factory, CW - 4);
  doc.text(gfLines, ML + 2, Y); updateY(gfLines.length * LH + PARA_GAP + 1);

  setFont('bold', 7); setTxt(P.purple); doc.text('Garantia de Adaptação:', ML + 2, Y); updateY(LH + 0.5);
  setFont('normal', 8); setTxt(P.textMain);
  const gaLines = doc.splitTextToSize(cfg.warranty_adaptation || DEFAULT_CFG.warranty_adaptation, CW - 4);
  doc.text(gaLines, ML + 2, Y); updateY(gaLines.length * LH + SEC_GAP);

  // ── SECTION 5 — VIP ──
  sectionHead('ACOMPANHAMENTO VIP VITALÍCIO');

  setFont('normal', 8); setTxt(P.textMain);
  const vipLines = doc.splitTextToSize(cfg.vip_intro || DEFAULT_CFG.vip_intro, CW - 4);
  doc.text(vipLines, ML + 2, Y); updateY(vipLines.length * LH + PARA_GAP);

  const revisoes = [
    { label: '1ª Revisão', desc: '3 meses após a compra' },
    { label: '2ª Revisão', desc: '9 meses após a compra' },
    { label: 'Revisões Subsequentes', desc: 'A cada 12 meses (anualmente)' },
  ];
  const BX2 = 2, TX2 = 5.5;
  revisoes.forEach(({ label, desc }) => {
    setFill(P.green); doc.rect(ML + BX2, Y - 1.6, 1.4, 1.4, 'F');
    setFont('bold', 8); setTxt(P.textMain); doc.text(label + ': ', ML + TX2, Y);
    const lw = doc.getTextWidth(label + ': ');
    setFont('normal', 8); doc.text(desc, ML + TX2 + lw, Y);
    updateY(LH + 1);
  });
  updateY(1);
  setFont('normal', 8); setTxt(P.textSub);
  const extraLines = doc.splitTextToSize(cfg.vip_extra || DEFAULT_CFG.vip_extra, CW - 4);
  doc.text(extraLines, ML + 2, Y); updateY(extraLines.length * LH + SEC_GAP);

  // ── ASSINATURA ──
  // Garante que não ultrapasse o limite seguro antes do footer
  if (Y > BOTTOM_MARGIN - 15) Y = BOTTOM_MARGIN - 15;
  const SIG_W = 55, SIG_X = PAGE_W - MR - SIG_W;
  setFill(P.textSub); doc.rect(SIG_X, Y, SIG_W, 0.3, 'F');
  updateY(LH);
  setFont('bold', 8.5); setTxt(P.textMain);
  doc.text(cfg.signer_name || 'Fabio Malveira', SIG_X + SIG_W/2, Y, { align: 'center' });
  updateY(LH);
  setFont('normal', 7); setTxt(P.textSub);
  doc.text(cfg.signer_role || 'Comercial Sonatta', SIG_X + SIG_W/2, Y, { align: 'center' });

  // ── FOOTER ──
  const FY = PAGE_H - FOOTER_H + 2;
  setFill(P.green); doc.rect(ML, FY, CW, 0.6, 'F');
  const FL = FY + 5;
  setFont('normal', 7); setTxt(P.textSub);
  doc.text(cfg.address || '', ML, FL);
  doc.text((cfg.phone || '') + '  ·  ' + (cfg.email || ''), ML, FL + 4.5);
  setFont('normal', 7); setTxt(P.purple);
  doc.text((cfg.website || '') + '  ·  ' + (cfg.instagram || ''), PAGE_W-MR, FL, { align: 'right' });

  return doc;
}

export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!quote.client_phone) { toast.error('Cliente sem telefone cadastrado'); return; }
    setLoading(true);
    try {
      const cfg = await loadCfg();
      const doc = await buildPDF(quote, cfg);
      const name = 'Orcamento_' + (quote.quote_number || 'Sonatta') + '.pdf';
      doc.save(name);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      console.error(e); toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm" variant="outline"
      className="border-[#622A7E] text-[#622A7E] hover:bg-[#622A7E] hover:text-white"
      onClick={handle} disabled={loading}
      title="Gerar PDF e enviar pelo WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}