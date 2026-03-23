import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const LOGO_URL =
  'https://media.base44.com/images/public/694e93aa7609bf14847de917/17777c948_SONATTA_CARDS-10.png';

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

  // Logo (left) — fixed height 20 mm, width proportional
  const LOGO_H = 20;
  const LOGO_W = 52; // ~3:1 ratio, no stretch
  const logoB64 = await loadB64(LOGO_URL);
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', ML, 8, LOGO_W, LOGO_H, undefined, 'NONE');
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
    // background – very light purple tint
    setFill([242, 236, 250]);
    doc.rect(ML, Y, CW, 7.5, 'F');
    // left accent
    setFill(P.purple);
    doc.rect(ML, Y, 2.5, 7.5, 'F');
    setFont('bold', 9.5); setTxt(P.purple);
    doc.text(label, ML + 5.5, Y + 5.3);
    Y += 10;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — DADOS DO CLIENTE
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('DADOS DO CLIENTE');

  // 2-column grid  (col A: ML … ML+CW/2-4   |   col B: ML+CW/2+2 … RX)
  const COL_A = ML + 3;
  const COL_B = ML + CW / 2 + 4;
  const VAL_OFFSET = 22; // label width before value

  const clientPairs = [
    [['Nome',    quote.client_name  || '—'], ['CPF',    quote.client_cpf   || '—']],
    [['Telefone',quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
  ];

  clientPairs.forEach(([left, right]) => {
    setFont('bold', 8); setTxt(P.textSub);
    doc.text(left[0] + ':', COL_A, Y);
    doc.text(right[0] + ':', COL_B, Y);

    setFont('normal', 9); setTxt(P.textMain);
    doc.text(
      doc.splitTextToSize(left[1],  CW / 2 - VAL_OFFSET - 2)[0],
      COL_A + VAL_OFFSET, Y
    );
    doc.text(
      doc.splitTextToSize(right[1], CW / 2 - VAL_OFFSET - 2)[0],
      COL_B + VAL_OFFSET, Y
    );
    Y += 6.5;
  });

  Y += 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — ITENS DO ORÇAMENTO  (table)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('ITENS DO ORÇAMENTO');

  // Column x-positions & widths
  const TC = {
    desc:  { x: ML,          w: 105 },
    qty:   { x: ML + 107,    w: 14  },
    unit:  { x: ML + 123,    w: 24  },
    total: { x: ML + 149,    w: 21  },
  };
  const TR = PAGE_W - MR; // right edge for right-align

  // Table header row
  const TH = 7;
  setFill(P.purple); doc.rect(ML, Y, CW, TH, 'F');
  setFont('bold', 8.5); setTxt(P.white);
  doc.text('Descrição',   TC.desc.x + 2,        Y + 4.9);
  doc.text('Qtd',         TC.qty.x  + TC.qty.w  / 2, Y + 4.9, { align: 'center' });
  doc.text('Vlr. Unit.',  TC.unit.x + TC.unit.w - 1,  Y + 4.9, { align: 'right' });
  doc.text('Total',       TR - 1,               Y + 4.9, { align: 'right' });
  Y += TH + 1;

  // Rows
  let zebra = false;
  (quote.items || []).forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 3);
    const rowH = Math.max(7, nameLines.length * 5.2 + 2);

    if (zebra) { setFill(P.rowAlt); doc.rect(ML, Y, CW, rowH, 'F'); }

    setFont('normal', 9); setTxt(P.textMain);
    doc.text(nameLines,              TC.desc.x + 2,               Y + 4.5);
    doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w / 2, Y + 4.5, { align: 'center' });
    doc.text(BRL(item.unit_price),   TC.unit.x + TC.unit.w - 1,   Y + 4.5, { align: 'right' });
    doc.text(BRL(item.total),        TR - 1,                       Y + 4.5, { align: 'right' });

    Y += rowH;
    zebra = !zebra;
  });

  // Bottom table rule
  rule(ML, Y, CW, P.divider, 0.5);
  Y += 6;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — RESUMO FINANCEIRO  (right-aligned card)
  // ══════════════════════════════════════════════════════════════════════════
  const CARD_W = 82;
  const CARD_X = PAGE_W - MR - CARD_W;
  const hasDsc  = (quote.discount || 0) > 0;
  const CARD_H  = hasDsc ? 30 : 23;

  // card border box
  setFill([250, 247, 254]);
  setStroke(P.divider);
  doc.setLineWidth(0.4);
  doc.roundedRect(CARD_X, Y, CARD_W, CARD_H, 2.5, 2.5, 'FD');

  let CY = Y + 7;
  const LBL_X  = CARD_X + 4;
  const VAL_X  = CARD_X + CARD_W - 4;

  const finRow = (label, value) => {
    setFont('normal', 9); setTxt(P.textSub);
    doc.text(label, LBL_X, CY);
    setFont('normal', 9); setTxt(P.textMain);
    doc.text(value, VAL_X, CY, { align: 'right' });
    CY += 6.5;
  };

  finRow('Subtotal:', BRL(quote.subtotal));
  if (hasDsc) {
    const pct = quote.subtotal > 0
      ? ((quote.discount / quote.subtotal) * 100).toFixed(1) : 0;
    setFont('normal', 9); setTxt(P.textSub);
    doc.text('Desconto (' + pct + '%):', LBL_X, CY);
    setFont('bold', 9); setTxt(P.green);
    doc.text('- ' + BRL(quote.discount), VAL_X, CY, { align: 'right' });
    CY += 6.5;
  }

  // TOTAL highlight
  setFill(P.purple);
  doc.roundedRect(CARD_X, CY - 2, CARD_W, 11, 2, 2, 'F');
  setFont('bold', 11.5); setTxt(P.white);
  doc.text('TOTAL', LBL_X, CY + 5.5);
  doc.text(BRL(quote.total), VAL_X, CY + 5.5, { align: 'right' });

  Y += CARD_H + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — CONDIÇÕES COMERCIAIS
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('CONDIÇÕES COMERCIAIS');

  const inst18 = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;
  const conds = [
    'Parcelamento em até 18× no cartão de crédito — 18× de ' + BRL(inst18),
    'Pagamento à vista (Dinheiro ou PIX) com desconto especial: ' + BRL(quote.total),
    'PIX Parcelado: condições a combinar',
    'Garantia: 2 a 4 anos conforme o fabricante',
    'Validade desta proposta: ' + (quote.validity_days || 30) + ' dias',
  ];

  setFont('normal', 9.5); setTxt(P.textMain);
  conds.forEach((line) => {
    // green circle bullet
    setFill(P.green);
    doc.circle(ML + 1.8, Y - 0.8, 1.1, 'F');
    doc.text(line, ML + 5.5, Y);
    Y += 7;
  });

  if (quote.notes) {
    Y += 4;
    setFont('bold', 9); setTxt(P.purple);
    doc.text('Observações:', ML, Y); Y += 5.5;
    setFont('normal', 9); setTxt(P.textMain);
    const obs = doc.splitTextToSize(quote.notes, CW);
    doc.text(obs, ML, Y);
    Y += obs.length * 5.5 + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER  (pinned to bottom, clean)
  // ══════════════════════════════════════════════════════════════════════════
  const FY = PAGE_H - 22;

  rule(ML, FY, CW, P.green,  0.9);
  rule(ML, FY + 1.3, CW, P.purple, 0.3);

  const foot = [
    'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Adrianópolis, Manaus – AM, 69057-035',
    '(92) 98464-5343  ·  atendimento@casacaracol.com.br  ·  sonatta.store',
  ];
  let FLY = FY + 6.5;
  setFont('normal', 7.5); setTxt(P.textSub);
  foot.forEach((l) => { doc.text(l, ML, FLY); FLY += 4.5; });

  setFont('normal', 7.5); setTxt(P.purple);
  doc.text('@sonatta.store  ·  Instagram  ·  Facebook  ·  LinkedIn', PAGE_W - MR, FY + 6.5, { align: 'right' });

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