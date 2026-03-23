import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const LOGO_URL =
  'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png';

// ── Palette ──────────────────────────────────────────────────────────────────
const P = {
  purple:    [98,  42, 126],   // #622A7E
  green:     [136, 188,  7],   // #88BC07
  textMain:  [32,  31,  28],   // #201F1C
  textSub:   [66,  63,  51],   // #423F33
  white:     [255, 255, 255],
  rowAlt:    [249, 246, 252],   // very light purple tint for zebra
  pageBg:    [255, 255, 255],
  divider:   [220, 214, 230],
};

// ── Formatters ────────────────────────────────────────────────────────────────
const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (raw) => {
  if (!raw) return '—';
  try {
    const s = String(raw);
    // handle YYYY-MM-DD or ISO
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  } catch { return '—'; }
};

// ── Image loader ──────────────────────────────────────────────────────────────
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

// ── Build PDF (pure vectors + text) ──────────────────────────────────────────
async function buildPDF(quote) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 20;          // margin left
  const MR = 20;          // margin right
  const CW = PAGE_W - ML - MR;  // 170 mm content width

  // ── Shorthand setters ──
  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setTxt    = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };

  // ── Thin rule ──
  const rule = (x, y, w, color = P.divider, h = 0.35) => {
    setFill(color); doc.rect(x, y, w, h, 'F');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER  (y = 0 → 44)
  // ══════════════════════════════════════════════════════════════════════════

  // White page bg
  setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Logo (left) — fixed height 22 mm, width proportional from natural image size
  const LOGO_MAX_H = 22;
  const LOGO_MAX_W = 70;
  const logoB64 = await loadB64(LOGO_URL);
  if (logoB64) {
    // Get natural dimensions from a temp image to preserve aspect ratio
    const tmpImg = new Image();
    await new Promise((r) => { tmpImg.onload = r; tmpImg.onerror = r; tmpImg.src = logoB64; });
    const ratio = tmpImg.naturalWidth / tmpImg.naturalHeight;
    let lw = LOGO_MAX_H * ratio;
    let lh = LOGO_MAX_H;
    if (lw > LOGO_MAX_W) { lw = LOGO_MAX_W; lh = lw / ratio; }
    doc.addImage(logoB64, 'PNG', ML, 8, lw, lh, undefined, 'NONE');
  } else {
    setFont('bold', 20); setTxt(P.purple);
    doc.text('SONATTA', ML, 22);
    setFont('normal', 9); setTxt(P.textSub);
    doc.text('Soluções Auditivas', ML, 28);
  }

  // Right block — meta info, right-aligned
  const RX = PAGE_W - MR;

  setFont('bold', 14); setTxt(P.purple);
  doc.text('PROPOSTA COMERCIAL', RX, 12, { align: 'right' });

  setFont('normal', 9); setTxt(P.textSub);
  doc.text('Nº ' + (quote.quote_number || '—'), RX, 19, { align: 'right' });
  doc.text('Data: ' + fmtDate(quote.created_date), RX, 25, { align: 'right' });

  const validUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (quote.validity_days || 30));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
  })();
  doc.text('Válida até: ' + validUntil, RX, 31, { align: 'right' });

  // Accent line — thin green strip below header
  const HEADER_BOTTOM = 36;
  setFill(P.green); doc.rect(ML, HEADER_BOTTOM, CW, 1.0, 'F');

  let Y = 43; // cursor

  // ══════════════════════════════════════════════════════════════════════════
  // Section header helper
  // ══════════════════════════════════════════════════════════════════════════
  const sectionHead = (label) => {
    // Very light tint background (purple ~8% opacity simulation via near-white)
    setFill([246, 241, 251]);
    doc.rect(ML, Y, CW, 6.5, 'F');
    // Thin left accent bar (2 mm wide)
    setFill(P.purple);
    doc.rect(ML, Y, 2, 6.5, 'F');
    // Section title
    setFont('bold', 11); setTxt(P.purple);
    doc.text(label, ML + 5, Y + 4.6);
    Y += 9;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — DADOS DO CLIENTE
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('DADOS DO CLIENTE');

  Y += 3; // extra breathing room below section title
  // 2-column grid with fixed label width (aligned "on the grid")
  // Col A: x=ML+3  |  Col B: x=ML+CW/2+3
  // Labels fixed at 26 mm wide so values always start at same x
  const COL_A_LBL = ML + 3;
  const COL_A_VAL = ML + 29;          // label + 26 mm
  const COL_B_LBL = ML + CW / 2 + 3;
  const COL_B_VAL = ML + CW / 2 + 29; // same offset
  const HALF_VAL_W = CW / 2 - 32;     // max value text width

  const clientPairs = [
    [['Nome',     quote.client_name  || '—'], ['CPF',    quote.client_cpf   || '—']],
    [['Telefone', quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
  ];

  clientPairs.forEach(([left, right]) => {
    // Labels
    setFont('bold', 8.5); setTxt(P.textSub);
    doc.text(left[0] + ':', COL_A_LBL, Y);
    doc.text(right[0] + ':', COL_B_LBL, Y);
    // Values
    setFont('normal', 9.5); setTxt(P.textMain);
    doc.text(doc.splitTextToSize(left[1],  HALF_VAL_W)[0], COL_A_VAL, Y);
    doc.text(doc.splitTextToSize(right[1], HALF_VAL_W)[0], COL_B_VAL, Y);
    Y += 7;
  });

  // Light divider after client block
  rule(ML, Y, CW, P.divider, 0.3);
  Y += 9;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — ITENS DO ORÇAMENTO  (table)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('ITENS DO ORÇAMENTO');

  // Column layout
  const TC = {
    desc:  { x: ML,       w: 100 },
    qty:   { x: ML + 102, w: 14  },
    unit:  { x: ML + 118, w: 28  },
    total: { x: ML + 148, w: 22  },
  };
  const TR = PAGE_W - MR;
  const TH = 7.5;

  const drawTableHeader = (startY) => {
    setFill(P.purple); doc.rect(ML, startY, CW, TH, 'F');
    setFont('bold', 9); setTxt(P.white);
    doc.text('Descrição',   TC.desc.x + 2,              startY + 5.2);
    doc.text('Qtd',         TC.qty.x + TC.qty.w / 2,    startY + 5.2, { align: 'center' });
    doc.text('Valor Unit.', TC.unit.x + TC.unit.w - 1,  startY + 5.2, { align: 'right' });
    doc.text('Total',       TR - 1,                     startY + 5.2, { align: 'right' });
    return startY + TH;
  };

  Y = drawTableHeader(Y);

  let zebra = false;
  (quote.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 3);
    const rowH = Math.max(7.5, nameLines.length * 5.5 + 3);

    // Page break: if row won't fit, add new page and repeat header
    if (Y + rowH > PAGE_H - 30) {
      doc.addPage();
      setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      Y = ML;
      Y = drawTableHeader(Y);
      zebra = false;
    }

    // Zebra background
    if (zebra) {
      setFill([245, 243, 248]); // very light neutral gray
      doc.rect(ML, Y, CW, rowH, 'F');
    }

    // Row content
    setFont('normal', 9.5); setTxt(P.textMain);
    doc.text(nameLines,                  TC.desc.x + 2,              Y + 5);
    doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w / 2,   Y + 5, { align: 'center' });
    doc.text(BRL(item.unit_price),       TC.unit.x + TC.unit.w - 1, Y + 5, { align: 'right' });
    doc.text(BRL(item.total),            TR - 1,                     Y + 5, { align: 'right' });

    // Thin bottom separator per row
    setFill([220, 215, 230]); doc.rect(ML, Y + rowH - 0.3, CW, 0.3, 'F');

    Y += rowH;
    zebra = !zebra;
  });

  // Bottom rule
  setFill(P.purple); doc.rect(ML, Y, CW, 0.5, 'F');
  Y += 7;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — RESUMO FINANCEIRO  (dois boxes de opção)
  // ══════════════════════════════════════════════════════════════════════════
  const hasDsc    = (quote.discount || 0) > 0;
  const totalAVista = quote.total; // subtotal - desconto
  const inst18      = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;

  // Two side-by-side option cards
  const OPT_W  = CW / 2 - 3;
  const OPT_X1 = ML;
  const OPT_X2 = ML + OPT_W + 6;

  // ── Option A: À Vista ──
  const OPT_H = 32;
  // header bar
  setFill(P.green); doc.roundedRect(OPT_X1, Y, OPT_W, 8, 2, 2, 'F');
  setFont('bold', 9); setTxt(P.white);
  doc.text('À VISTA  (Dinheiro ou PIX)', OPT_X1 + OPT_W / 2, Y + 5.5, { align: 'center' });
  // body
  setFill([250, 252, 243]); setStroke([180, 210, 60]);
  doc.setLineWidth(0.35);
  doc.roundedRect(OPT_X1, Y + 7, OPT_W, OPT_H - 7, 2, 2, 'FD');
  // subtotal line
  const AX = OPT_X1 + OPT_W - 5;
  let AY = Y + 14;
  setFont('normal', 8.5); setTxt(P.textSub);
  doc.text('Subtotal:', OPT_X1 + 5, AY);
  setFont('normal', 8.5); setTxt(P.textMain);
  doc.text(BRL(quote.subtotal), AX, AY, { align: 'right' });
  AY += 6.5;
  if (hasDsc) {
    const pct = quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) + '%' : '';
    setFont('normal', 8.5); setTxt(P.textSub);
    doc.text('Desconto ' + (pct ? '(' + pct + ')' : '') + ':', OPT_X1 + 5, AY);
    setFont('bold', 8.5); setTxt([80, 140, 0]);
    doc.text('- ' + BRL(quote.discount), AX, AY, { align: 'right' });
    AY += 6.5;
  }
  setFill([180, 210, 60]); doc.rect(OPT_X1 + 3, AY - 1, OPT_W - 6, 0.3, 'F');
  AY += 3;
  setFont('bold', 12); setTxt([60, 110, 0]);
  doc.text(BRL(totalAVista), OPT_X1 + OPT_W / 2, AY, { align: 'center' });

  // ── Option B: Parcelado ──
  setFill(P.purple); doc.roundedRect(OPT_X2, Y, OPT_W, 8, 2, 2, 'F');
  setFont('bold', 9); setTxt(P.white);
  doc.text('PARCELADO  (Cartão de Crédito)', OPT_X2 + OPT_W / 2, Y + 5.5, { align: 'center' });
  setFill([250, 247, 254]); setStroke([210, 200, 225]);
  doc.setLineWidth(0.35);
  doc.roundedRect(OPT_X2, Y + 7, OPT_W, OPT_H - 7, 2, 2, 'FD');
  const BX = OPT_X2 + OPT_W - 5;
  let BY = Y + 14;
  setFont('normal', 8.5); setTxt(P.textSub);
  doc.text('Valor total:', OPT_X2 + 5, BY);
  setFont('normal', 8.5); setTxt(P.textMain);
  doc.text(BRL(quote.subtotal), BX, BY, { align: 'right' });
  BY += 6.5;
  setFont('normal', 8.5); setTxt(P.textSub);
  doc.text('Parcelamento em até 18×:', OPT_X2 + 5, BY);
  BY += 6.5;
  setFill([210, 200, 225]); doc.rect(OPT_X2 + 3, BY - 1, OPT_W - 6, 0.3, 'F');
  BY += 3;
  setFont('bold', 12); setTxt(P.purple);
  doc.text(BRL(inst18) + '/mês', OPT_X2 + OPT_W / 2, BY, { align: 'center' });

  Y += OPT_H + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — CONDIÇÕES COMERCIAIS
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('CONDIÇÕES COMERCIAIS');

  const conds = [
    'Parcelamento em até 18× no cartão de crédito — a partir de ' + BRL(inst18) + '/mês',
    'Pagamento à vista (Dinheiro ou PIX): ' + BRL(quote.total),
    'PIX Parcelado: condições a combinar',
    'Garantia: 2 a 4 anos conforme fabricante',
    'Validade desta proposta: ' + (quote.validity_days || 30) + ' dias',
  ];

  Y += 3; // extra breathing room below section title
  const LINE_H = 6.8; // ~1.4× line height
  setFont('normal', 9.5); setTxt(P.textMain);
  conds.forEach((line) => {
    // Small square bullet in green
    setFill(P.green);
    doc.rect(ML + 1, Y - 2.2, 1.8, 1.8, 'F');
    const wrapped = doc.splitTextToSize(line, CW - 8);
    doc.text(wrapped, ML + 6, Y);
    Y += wrapped.length * LINE_H;
  });

  if (quote.notes) {
    Y += 5;
    setFont('bold', 9.5); setTxt(P.purple);
    doc.text('Observações:', ML, Y); Y += 6;
    setFont('normal', 9); setTxt(P.textMain);
    const obs = doc.splitTextToSize(quote.notes, CW);
    doc.text(obs, ML, Y);
    Y += obs.length * 5.5 + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER  (pinned to bottom, clean)
  // ══════════════════════════════════════════════════════════════════════════
  const FY = PAGE_H - 20;

  // Single thin accent line (green)
  setFill(P.green); doc.rect(ML, FY, CW, 0.8, 'F');

  // Footer: address left | social right
  const FL = FY + 6;
  setFont('normal', 8); setTxt(P.textSub);
  doc.text('Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM', ML, FL);
  doc.text('(92) 98464-5343  ·  atendimento@casacaracol.com.br', ML, FL + 5);

  setFont('normal', 8); setTxt(P.purple);
  doc.text('sonatta.store  ·  @sonatta.store', PAGE_W - MR, FL, { align: 'right' });
  doc.text('Instagram  ·  Facebook  ·  LinkedIn', PAGE_W - MR, FL + 5, { align: 'right' });

  return doc;
}

// ── React Component ───────────────────────────────────────────────────────────
export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!quote.client_phone) { toast.error('Cliente sem telefone cadastrado'); return; }
    setLoading(true);
    try {
      const doc  = await buildPDF(quote);
      const name = 'Orcamento_' + (quote.quote_number || 'Sonatta') + '.pdf';
      doc.save(name);

      await new Promise((r) => setTimeout(r, 600));

      const phone = quote.client_phone.replace(/\D/g, '');
      const msg =
        'Olá ' + quote.client_name + '! 😊\n\n' +
        'Segue em anexo a proposta *Nº ' + quote.quote_number + '* da Sonatta Soluções Auditivas.\n\n' +
        '📋 *Itens:*\n' + (quote.items || []).map((i) => '• ' + i.product_name).join('\n') +
        '\n\n💰 *Total:* ' + BRL(quote.total) +
        '\n📅 *Validade:* ' + (quote.validity_days || 30) + ' dias\n\n' +
        'Estamos à disposição! 🎧\n_Equipe Sonatta_';

      openWhatsApp('55' + phone, msg);
      if (onStatusChange) await onStatusChange(quote, 'enviado');
      toast.success('PDF gerado e WhatsApp aberto!');
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