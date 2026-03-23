import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const LOGO_URL = 'https://media.base44.com/images/public/694e93aa7609bf14847de917/17777c948_SONATTA_CARDS-10.png';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  purple:     [98,  42,  126], // #622A7E
  green:      [136, 188, 7],   // #88BC07
  textMain:   [32,  31,  28],  // #201F1C
  textSub:    [66,  63,  51],  // #423F33
  white:      [255, 255, 255],
  rowAlt:     [248, 246, 251], // very light purple tint
  sectionBg:  [245, 240, 250], // section header background light
  borderGray: [220, 215, 228],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const fmtDate = (date) => {
  if (!date) return '—';
  const d = new Date(date + 'T12:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

// ── PDF Generator ─────────────────────────────────────────────────────────────
async function buildPDF(quote) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  const W = 210;
  const H = 297;
  const ML = 18; // margin left
  const MR = 18; // margin right
  const CW = W - ML - MR; // content width = 174

  // ── Helper: set fill ─────────────────────────────────────────
  const fill = (rgb) => doc.setFillColor(...rgb);
  const stroke = (rgb) => doc.setDrawColor(...rgb);
  const textColor = (rgb) => doc.setTextColor(...rgb);
  const font = (style, size) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };

  // ══════════════════════════════════════════════════════════════
  // HEADER  (0 → 46 mm)
  // ══════════════════════════════════════════════════════════════

  // White background (default)
  fill(C.white);
  doc.rect(0, 0, W, 46, 'F');

  // Top accent bar – thin green strip
  fill(C.green);
  doc.rect(0, 0, W, 1.2, 'F');

  // Logo area (left)
  const logoData = await loadImageAsBase64(LOGO_URL);
  if (logoData) {
    doc.addImage(logoData, 'PNG', ML, 5, 46, 28, undefined, 'FAST');
  } else {
    textColor(C.purple);
    font('bold', 20);
    doc.text('SONATTA', ML, 20);
    font('normal', 9);
    textColor(C.textSub);
    doc.text('Soluções Auditivas', ML, 27);
  }

  // Right block – meta info
  const rxEnd = W - MR;
  font('bold', 15);
  textColor(C.purple);
  doc.text('Proposta Comercial', rxEnd, 13, { align: 'right' });

  font('normal', 9);
  textColor(C.textSub);
  doc.text('Nº ' + (quote.quote_number || '—'), rxEnd, 20, { align: 'right' });
  doc.text('Data: ' + fmtDate(quote.created_date), rxEnd, 26, { align: 'right' });
  const validDate = new Date();
  validDate.setDate(validDate.getDate() + (quote.validity_days || 30));
  doc.text('Válida até: ' + validDate.toLocaleDateString('pt-BR'), rxEnd, 32, { align: 'right' });

  // Bottom header separator – green line + thin purple line
  fill(C.green);
  doc.rect(ML, 42, CW, 0.8, 'F');
  fill(C.purple);
  doc.rect(ML, 43.2, CW, 0.3, 'F');

  // ══════════════════════════════════════════════════════════════
  // Cursor
  // ══════════════════════════════════════════════════════════════
  let y = 50;

  // ── Section helper ─────────────────────────────────────────
  const sectionHeader = (title) => {
    // light purple-tinted background
    fill(C.sectionBg);
    doc.rect(ML, y, CW, 7, 'F');
    // left accent bar
    fill(C.purple);
    doc.rect(ML, y, 2.5, 7, 'F');
    font('bold', 10);
    textColor(C.purple);
    doc.text(title, ML + 5, y + 5);
    y += 10;
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 1 — DADOS DO CLIENTE
  // ══════════════════════════════════════════════════════════════
  sectionHeader('DADOS DO CLIENTE');

  const clientRows = [
    ['Nome',    quote.client_name  || '—', 'CPF',    quote.client_cpf   || '—'],
    ['Telefone',quote.client_phone || '—', 'E-mail', quote.client_email || '—'],
  ];

  const col1x = ML + 2;
  const col2x = ML + CW / 2 + 2;
  const labelW = 18;

  clientRows.forEach((row) => {
    // row[0] label, row[1] value  |  row[2] label, row[3] value
    font('bold', 8.5);
    textColor(C.textSub);
    doc.text(row[0] + ':', col1x, y);
    font('normal', 9);
    textColor(C.textMain);
    doc.text(row[1], col1x + labelW, y);

    font('bold', 8.5);
    textColor(C.textSub);
    doc.text(row[2] + ':', col2x, y);
    font('normal', 9);
    textColor(C.textMain);
    doc.text(row[3], col2x + labelW, y);
    y += 6;
  });

  y += 6;

  // ══════════════════════════════════════════════════════════════
  // SECTION 2 — ITENS DO ORÇAMENTO
  // ══════════════════════════════════════════════════════════════
  sectionHeader('ITENS DO ORÇAMENTO');

  // Table column positions
  const tDescX    = ML;
  const tQtyX     = ML + 114;
  const tUnitX    = ML + 130;
  const tTotalX   = ML + 156;
  const tDescW    = 112;

  // Table header
  fill(C.purple);
  doc.rect(ML, y, CW, 7, 'F');
  font('bold', 8.5);
  textColor(C.white);
  doc.text('Descrição',   tDescX + 2,  y + 5);
  doc.text('Qtd',         tQtyX,       y + 5);
  doc.text('Vlr. Unit.',  tUnitX,      y + 5);
  doc.text('Total',       tTotalX + 14, y + 5, { align: 'right' });
  y += 9;

  font('normal', 9);
  let altRow = false;
  (quote.items || []).forEach((item) => {
    const lines = doc.splitTextToSize(item.product_name || '—', tDescW);
    const rowH = Math.max(6.5, lines.length * 5.5);

    if (altRow) {
      fill(C.rowAlt);
      doc.rect(ML, y - 1, CW, rowH + 1, 'F');
    }

    textColor(C.textMain);
    doc.text(lines,                           tDescX + 2,        y + 3.5);
    doc.text(String(item.quantity || 1),       tQtyX,             y + 3.5);
    doc.text(fmt(item.unit_price),             tUnitX,            y + 3.5);
    doc.text(fmt(item.total),                  tTotalX + 14,      y + 3.5, { align: 'right' });

    y += rowH + 1;
    altRow = !altRow;
  });

  // Bottom border of table
  stroke(C.borderGray);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + CW, y);
  y += 6;

  // ══════════════════════════════════════════════════════════════
  // SECTION 3 — RESUMO FINANCEIRO (right-aligned card)
  // ══════════════════════════════════════════════════════════════
  const cardW = 80;
  const cardX = W - MR - cardW;

  // Card background + border
  fill([252, 250, 255]);
  stroke(C.borderGray);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, y, cardW, quote.discount > 0 ? 29 : 22, 2, 2, 'FD');

  let cy = y + 7;
  const labelX = cardX + 4;
  const valueX = cardX + cardW - 4;

  const drawFinRow = (label, value, isBold = false) => {
    if (isBold) {
      font('bold', 9);
    } else {
      font('normal', 9);
    }
    textColor(C.textSub);
    doc.text(label, labelX, cy);
    textColor(isBold ? C.textMain : C.textMain);
    doc.text(value, valueX, cy, { align: 'right' });
    cy += 6;
  };

  drawFinRow('Subtotal:', fmt(quote.subtotal));
  if (quote.discount > 0) {
    const pct = quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) : 0;
    drawFinRow('Desconto (' + pct + '%):', '- ' + fmt(quote.discount));
  }

  // TOTAL highlight row
  const totalRowH = 10;
  fill(C.purple);
  doc.roundedRect(cardX, cy - 2, cardW, totalRowH, 2, 2, 'F');
  font('bold', 11);
  textColor(C.white);
  doc.text('TOTAL', labelX, cy + 5);
  doc.text(fmt(quote.total), valueX, cy + 5, { align: 'right' });

  y += (quote.discount > 0 ? 29 : 22) + 10;

  // ══════════════════════════════════════════════════════════════
  // SECTION 4 — CONDIÇÕES COMERCIAIS
  // ══════════════════════════════════════════════════════════════
  sectionHeader('CONDIÇÕES COMERCIAIS');

  const installment18 = (quote.subtotal > 0 ? quote.subtotal : quote.total) / 18;
  const conditions = [
    'Parcelamento em até 18x no cartão de crédito — 18x de ' + fmt(installment18),
    'Desconto especial para pagamento à vista (Dinheiro ou PIX): ' + fmt(quote.total),
    'PIX Parcelado: condições a combinar',
    'Garantia: 2 a 4 anos conforme o fabricante',
    'Validade desta proposta: ' + (quote.validity_days || 30) + ' dias',
  ];

  font('normal', 9.5);
  textColor(C.textMain);
  conditions.forEach((line) => {
    // bullet
    fill(C.green);
    doc.circle(ML + 1.5, y - 1, 1, 'F');
    doc.text(line, ML + 5, y);
    y += 6.5;
  });

  if (quote.notes) {
    y += 3;
    font('bold', 9);
    textColor(C.purple);
    doc.text('Observações:', ML, y);
    y += 5;
    font('normal', 9);
    textColor(C.textMain);
    const obsLines = doc.splitTextToSize(quote.notes, CW);
    doc.text(obsLines, ML, y);
    y += obsLines.length * 5.5 + 4;
  }

  // ══════════════════════════════════════════════════════════════
  // FOOTER  — clean, at bottom
  // ══════════════════════════════════════════════════════════════
  const FY = H - 22;

  // Thin green top line
  fill(C.green);
  doc.rect(ML, FY, CW, 0.8, 'F');

  // Thin purple under green
  fill(C.purple);
  doc.rect(ML, FY + 1, CW, 0.3, 'F');

  font('normal', 7.5);
  textColor(C.textSub);

  const footerL = [
    'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007',
    'Adrianópolis, Manaus – AM, 69057-035',
    '(92) 98464-5343  ·  atendimento@casacaracol.com.br  ·  sonatta.store',
  ];
  let fy = FY + 6;
  footerL.forEach((line) => {
    doc.text(line, ML, fy);
    fy += 4.5;
  });

  font('normal', 7.5);
  textColor(C.purple);
  doc.text('@sonatta.store', W - MR, FY + 6, { align: 'right' });
  doc.text('Instagram  ·  Facebook', W - MR, FY + 10.5, { align: 'right' });

  return doc;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const handleGenerateAndSend = async () => {
    if (!quote.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }
    setLoading(true);
    try {
      const doc = await buildPDF(quote);
      const filename = 'Orcamento_' + (quote.quote_number || 'Sonatta') + '.pdf';
      doc.save(filename);

      await new Promise((res) => setTimeout(res, 600));

      const phone = quote.client_phone.replace(/\D/g, '');
      const message =
        'Olá ' + quote.client_name + '! 😊\n\n' +
        'Segue em anexo a proposta comercial *Nº ' + quote.quote_number + '* da Sonatta Soluções Auditivas.\n\n' +
        '📋 *Resumo:*\n' +
        (quote.items || []).map((i) => '• ' + i.product_name).join('\n') +
        '\n\n💰 *Total:* ' + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total || 0) + '\n' +
        '📅 *Validade:* ' + (quote.validity_days || 30) + ' dias\n\n' +
        'Qualquer dúvida estamos à disposição! 🎧\n\n_Equipe Sonatta_';

      openWhatsApp('55' + phone, message);

      if (onStatusChange) await onStatusChange(quote, 'enviado');
      toast.success('PDF gerado e WhatsApp aberto!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-[#622A7E] text-[#622A7E] hover:bg-[#622A7E] hover:text-white"
      onClick={handleGenerateAndSend}
      disabled={loading}
      title="Gerar PDF e enviar pelo WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}