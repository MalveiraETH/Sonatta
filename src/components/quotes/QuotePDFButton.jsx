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
  const PAGE_W = 210, PAGE_H = 297, ML = 15, MR = 15;
  const CW = PAGE_W - ML - MR;

  // ── Espaçamentos padronizados ──
  const LH      = 5.0;  // line-height padrão para texto 8pt
  const LH_SM   = 4.5;  // line-height para texto 7pt
  const SEC_GAP = 6;    // espaço entre seções
  const HEAD_PAD = 4;   // espaço entre cabeçalho de seção e primeiro texto
  const PARA_GAP = 4;   // espaço entre parágrafos dentro da seção
  const BULLET_X = 3;   // recuo do bullet
  const TEXT_X   = 7;   // recuo do texto após bullet

  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setTxt    = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };

  setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── HEADER ──
  const LOGO_MAX_H = 18, LOGO_MAX_W = 55;
  const logoB64 = await loadB64(cfg.logo_url);
  if (logoB64) {
    const tmpImg = new Image();
    await new Promise((r) => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = logoB64; });
    const ratio = tmpImg.naturalWidth / tmpImg.naturalHeight;
    let lw = LOGO_MAX_H * ratio, lh = LOGO_MAX_H;
    if (lw > LOGO_MAX_W) { lw = LOGO_MAX_W; lh = lw / ratio; }
    doc.addImage(logoB64, 'PNG', ML, 6, lw, lh, undefined, 'NONE');
  } else {
    setFont('bold', 18); setTxt(P.purple); doc.text('SONATTA', ML, 20);
  }

  const RX = PAGE_W - MR;
  setFont('bold', 13); setTxt(P.purple);
  doc.text(cfg.document_title || 'PROPOSTA COMERCIAL', RX, 10, { align: 'right' });
  setFont('normal', 8); setTxt(P.textSub);
  doc.text('Nº ' + (quote.quote_number || '—'), RX, 16.5, { align: 'right' });
  doc.text('Data: ' + fmtDate(quote.created_date), RX, 21.5, { align: 'right' });
  const validDays = quote.validity_days || cfg.validity_days || 30;
  const vd = new Date(); vd.setDate(vd.getDate() + validDays);
  const validUntil = String(vd.getDate()).padStart(2,'0') + '/' + String(vd.getMonth()+1).padStart(2,'0') + '/' + vd.getFullYear();
  doc.text('Válida até: ' + validUntil, RX, 26.5, { align: 'right' });

  setFill(P.green); doc.rect(ML, 31, CW, 0.8, 'F');
  let Y = 37;

  // ── Helper: cabeçalho de seção ──
  const SH = 6; // altura do cabeçalho de seção
  const sectionHead = (label) => {
    setFill([246, 241, 251]); doc.rect(ML, Y, CW, SH, 'F');
    setFill(P.purple); doc.rect(ML, Y, 2.5, SH, 'F');
    setFont('bold', 9); setTxt(P.purple);
    doc.text(label, ML + 5, Y + 4.2);
    Y += SH + HEAD_PAD;
  };

  // ── SECTION 1 — CLIENTE ──
  sectionHead('DADOS DO CLIENTE');
  const COL_A_LBL = ML + 2, COL_A_VAL = ML + 26;
  const COL_B_LBL = ML + CW/2 + 2, COL_B_VAL = ML + CW/2 + 26;
  const HALF_VAL_W = CW/2 - 28;

  [
    [['Nome', quote.client_name || '—'], ['CPF', quote.client_cpf || '—']],
    [['Telefone', quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
  ].forEach(([left, right], i) => {
    if (i > 0) Y += 1; // espaço extra entre linhas
    setFont('bold', 7.5); setTxt(P.textSub);
    doc.text(left[0] + ':', COL_A_LBL, Y);
    doc.text(right[0] + ':', COL_B_LBL, Y);
    setFont('normal', 8.5); setTxt(P.textMain);
    doc.text(doc.splitTextToSize(left[1], HALF_VAL_W)[0], COL_A_VAL, Y);
    doc.text(doc.splitTextToSize(right[1], HALF_VAL_W)[0], COL_B_VAL, Y);
    Y += LH + 1;
  });
  Y += 2;
  setFill(P.divider); doc.rect(ML, Y, CW, 0.25, 'F');
  Y += SEC_GAP;

  // ── SECTION 2 — ITENS ──
  sectionHead('ITENS DO ORÇAMENTO');
  const TC = { desc: { x: ML, w: 100 }, qty: { x: ML+102, w: 14 }, unit: { x: ML+118, w: 28 } };
  const TR = PAGE_W - MR, TH = 7;

  const drawTableHeader = (sy) => {
    setFill(P.purple); doc.rect(ML, sy, CW, TH, 'F');
    setFont('bold', 8); setTxt(P.white);
    doc.text('Descrição', TC.desc.x + 3, sy + 4.8);
    doc.text('Qtd', TC.qty.x + TC.qty.w/2, sy + 4.8, { align: 'center' });
    doc.text('Valor Unit.', TC.unit.x + TC.unit.w - 1, sy + 4.8, { align: 'right' });
    doc.text('Total', TR - 2, sy + 4.8, { align: 'right' });
    return sy + TH;
  };

  Y = drawTableHeader(Y);
  let zebra = false;
  (quote.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 4);
    const rowH = Math.max(7, nameLines.length * LH + 2.5);
    if (zebra) { setFill([245,243,248]); doc.rect(ML,Y,CW,rowH,'F'); }
    setFont('normal', 8.5); setTxt(P.textMain);
    doc.text(nameLines, TC.desc.x + 3, Y + 4.8);
    doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w/2, Y + 4.8, { align: 'center' });
    doc.text(BRL(item.unit_price), TC.unit.x + TC.unit.w - 1, Y + 4.8, { align: 'right' });
    doc.text(BRL(item.total), TR - 2, Y + 4.8, { align: 'right' });
    setFill([220,215,230]); doc.rect(ML, Y + rowH - 0.25, CW, 0.25, 'F');
    Y += rowH; zebra = !zebra;
  });
  setFill(P.purple); doc.rect(ML, Y, CW, 0.4, 'F');
  Y += SEC_GAP;

  // ── SECTION 3 — RESUMO FINANCEIRO ──
  const hasDsc = (quote.discount || 0) > 0;
  const totalAVista = quote.total;
  const inst18 = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;
  const OPT_W = CW/2 - 3, OPT_X1 = ML, OPT_X2 = ML + OPT_W + 6;
  const OPT_HEAD_H = 7;
  // Calcula altura do corpo dinamicamente para evitar sobreposição
  const INNER_PAD = 4;   // padding top interno
  const ROW_H = LH + 2;  // altura de cada linha de dado
  const DIV_GAP = 3;     // espaço entre linha divisória e valor final
  const VAL_H = 7;       // altura do valor final em negrito
  const BOTTOM_PAD = 3;  // padding bottom interno
  const rowsA = hasDsc ? 2 : 1;
  const OPT_BODY_H_A = INNER_PAD + rowsA * ROW_H + DIV_GAP + VAL_H + BOTTOM_PAD;
  const OPT_BODY_H_B = INNER_PAD + 2 * ROW_H + DIV_GAP + VAL_H + BOTTOM_PAD;
  const OPT_BODY_H = Math.max(OPT_BODY_H_A, OPT_BODY_H_B);
  const OPT_H = OPT_HEAD_H + OPT_BODY_H;

  // Opção A — À Vista
  setFill(P.green); doc.roundedRect(OPT_X1, Y, OPT_W, OPT_HEAD_H, 1.5, 1.5, 'F');
  setFont('bold', 8.5); setTxt(P.white);
  doc.text('À VISTA  (Dinheiro ou PIX)', OPT_X1 + OPT_W/2, Y + 4.9, { align: 'center' });
  setFill([250,252,243]); setStroke([180,210,60]); doc.setLineWidth(0.3);
  doc.roundedRect(OPT_X1, Y + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.5, 1.5, 'FD');
  const AX = OPT_X1 + OPT_W - 4; let AY = Y + OPT_HEAD_H + INNER_PAD;
  setFont('normal', 8); setTxt(P.textSub); doc.text('Subtotal:', OPT_X1 + 4, AY);
  setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), AX, AY, { align: 'right' });
  AY += ROW_H;
  if (hasDsc) {
    const pct = quote.subtotal > 0 ? ((quote.discount/quote.subtotal)*100).toFixed(1)+'%' : '';
    setFont('normal', 8); setTxt(P.textSub); doc.text('Desconto '+(pct?'('+pct+')':'')+':',OPT_X1+4,AY);
    setFont('bold', 8); setTxt([80,140,0]); doc.text('- '+BRL(quote.discount),AX,AY,{align:'right'});
    AY += ROW_H;
  }
  AY += 1;
  setFill([180,210,60]); doc.rect(OPT_X1+3, AY, OPT_W-6, 0.3, 'F');
  AY += DIV_GAP + 3;
  setFont('bold', 12); setTxt([60,110,0]); doc.text(BRL(totalAVista), OPT_X1+OPT_W/2, AY, { align: 'center' });

  // Opção B — Parcelado
  setFill(P.purple); doc.roundedRect(OPT_X2, Y, OPT_W, OPT_HEAD_H, 1.5, 1.5, 'F');
  setFont('bold', 8.5); setTxt(P.white);
  doc.text('PARCELADO  (Cartão de Crédito)', OPT_X2+OPT_W/2, Y+4.9, { align: 'center' });
  setFill([250,247,254]); setStroke([210,200,225]); doc.setLineWidth(0.3);
  doc.roundedRect(OPT_X2, Y + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.5, 1.5, 'FD');
  const BX = OPT_X2+OPT_W-4; let BY = Y + OPT_HEAD_H + INNER_PAD;
  setFont('normal', 8); setTxt(P.textSub); doc.text('Valor total:', OPT_X2+4, BY);
  setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), BX, BY, { align: 'right' });
  BY += ROW_H;
  setFont('normal', 8); setTxt(P.textSub); doc.text('Parcelamento em até 18×:', OPT_X2+4, BY);
  BY += ROW_H + 1;
  setFill([210,200,225]); doc.rect(OPT_X2+3, BY, OPT_W-6, 0.3, 'F');
  BY += DIV_GAP + 3;
  setFont('bold', 12); setTxt(P.purple); doc.text(BRL(inst18)+'/mês', OPT_X2+OPT_W/2, BY, { align: 'center' });

  Y += OPT_H + SEC_GAP;

  // ── Observações ──
  if (quote.notes) {
    setFont('bold', 8); setTxt(P.purple); doc.text('Observações:', ML, Y); Y += LH + 1;
    setFont('normal', 8); setTxt(P.textMain);
    const obs = doc.splitTextToSize(quote.notes, CW);
    doc.text(obs, ML, Y); Y += obs.length * LH + PARA_GAP;
  }

  // ── SECTION 4 — GARANTIA + VIP lado a lado ──
  Y += 2;
  const COL1X = ML, COL2X = ML + CW/2 + 3, COLW = CW/2 - 5;

  // Cabeçalhos lado a lado
  setFill([246,241,251]); doc.rect(COL1X, Y, COLW, SH, 'F');
  setFill(P.purple); doc.rect(COL1X, Y, 2.5, SH, 'F');
  setFont('bold', 8.5); setTxt(P.purple); doc.text('PRAZOS DE GARANTIA', COL1X+5, Y+4.2);

  setFill([246,241,251]); doc.rect(COL2X, Y, COLW, SH, 'F');
  setFill(P.purple); doc.rect(COL2X, Y, 2.5, SH, 'F');
  setFont('bold', 8.5); setTxt(P.purple); doc.text('ACOMPANHAMENTO VIP VITALÍCIO', COL2X+5, Y+4.2);
  Y += SH + HEAD_PAD;

  // Coluna esquerda — Garantia
  let GY = Y;
  setFont('bold', 8); setTxt(P.purple);
  doc.text('Garantia de Fábrica:', COL1X+2, GY);
  GY += LH + 1;
  setFont('normal', 7.5); setTxt(P.textMain);
  const gfLines = doc.splitTextToSize(cfg.warranty_factory || DEFAULT_CFG.warranty_factory, COLW - 4);
  doc.text(gfLines, COL1X+2, GY);
  GY += gfLines.length * LH_SM + PARA_GAP;
  setFont('bold', 8); setTxt(P.purple);
  doc.text('Garantia de Adaptação:', COL1X+2, GY);
  GY += LH + 1;
  setFont('normal', 7.5); setTxt(P.textMain);
  const gaLines = doc.splitTextToSize(cfg.warranty_adaptation || DEFAULT_CFG.warranty_adaptation, COLW - 4);
  doc.text(gaLines, COL1X+2, GY);
  GY += gaLines.length * LH_SM;

  // Coluna direita — VIP
  let VY = Y;
  setFont('normal', 7.5); setTxt(P.textMain);
  const vipLines = doc.splitTextToSize(cfg.vip_intro || DEFAULT_CFG.vip_intro, COLW - 4);
  doc.text(vipLines, COL2X+2, VY);
  VY += vipLines.length * LH_SM + PARA_GAP;

  const revisoes = [
    { label: '1ª Revisão', desc: '3 meses após a compra' },
    { label: '2ª Revisão', desc: '9 meses após a compra' },
    { label: 'Revisões Subsequentes', desc: 'A cada 12 meses (anualmente)' },
  ];
  setFont('normal', 7.5); setTxt(P.textMain);
  revisoes.forEach(({ label, desc }) => {
    setFill(P.green); doc.rect(COL2X+2, VY-1.8, 1.5, 1.5, 'F');
    setFont('bold', 7.5); doc.text(label + ': ', COL2X + TEXT_X, VY);
    const lw = doc.getTextWidth(label + ': ');
    setFont('normal', 7.5); doc.text(desc, COL2X + TEXT_X + lw, VY);
    VY += LH + 1;
  });
  VY += 2;
  setFont('normal', 7); setTxt(P.textSub);
  const extraLines = doc.splitTextToSize(cfg.vip_extra || DEFAULT_CFG.vip_extra, COLW - 4);
  doc.text(extraLines, COL2X+2, VY);
  VY += extraLines.length * LH_SM;

  Y = Math.max(GY, VY) + SEC_GAP + 2;

  // ── ASSINATURA (alinhada à direita) ──
  const SIG_W = 58, SIG_X = PAGE_W - MR - SIG_W;
  setFill(P.textSub); doc.rect(SIG_X, Y, SIG_W, 0.35, 'F');
  Y += LH;
  setFont('bold', 9); setTxt(P.textMain);
  doc.text(cfg.signer_name || 'Fabio Malveira', SIG_X + SIG_W/2, Y, { align: 'center' });
  Y += LH;
  setFont('normal', 8); setTxt(P.textSub);
  doc.text(cfg.signer_role || 'Comercial Sonatta', SIG_X + SIG_W/2, Y, { align: 'center' });
  Y += SEC_GAP + 2;

  // ── FOOTER ──
  const FY = Math.max(Y + 2, PAGE_H - 18);
  setFill(P.green); doc.rect(ML, FY, CW, 0.7, 'F');
  const FL = FY + 5.5;
  setFont('normal', 7); setTxt(P.textSub);
  doc.text(cfg.address || '', ML, FL);
  doc.text((cfg.phone || '') + '  ·  ' + (cfg.email || ''), ML, FL + 5);
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