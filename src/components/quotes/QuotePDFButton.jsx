import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { base44 } from '@/api/base44Client';
import { loadDocLayout, drawDocHeader, drawDocFooter } from '@/lib/pdfLetterhead';
import {
  fillDocumentVariables,
  loadDocumentContext,
  stripUnresolvedVariables,
} from '@/lib/fillDocumentVariables';
import {
  DEFAULT_CONTENT_HTML,
  buildQuoteVariables,
  loadQuoteBlocks,
  loadQuoteTemplate,
  quoteCategories,
  resolveCategoryBlocks,
  splitQuoteContent,
} from '@/lib/quoteBlocks';

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
  // tabela
  table_col_desc: 'Descrição',
  table_col_qty: 'Qtd',
  table_col_unit: 'Valor Unit.',
  table_col_total: 'Total',
  // financeiro
  payment_label_cash: 'À VISTA  (Dinheiro ou PIX)',
  payment_label_card: 'PARCELADO  (Cartão de Crédito)',
  payment_installments: 18,
  payment_installments_label: 'Parcelamento em até {n}×',
  section_content_gap: 3,
  line_height_content: 4.5,
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

// ── Converte HTML do Quill em segmentos para o jsPDF ──────────────────────────
// Retorna array de { text, bold, italic, size?, lineheight?, newline? }
function parseHtmlToSegments(html) {
  if (!html) return [{ text: '', bold: false, italic: false }];
  const div = document.createElement('div');
  div.innerHTML = html;
  const segments = [];

  function walk(node, bold, italic, size) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent;
      if (t) segments.push({ text: t, bold, italic, size });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const isBold   = bold   || tag === 'strong' || tag === 'b' || tag === 'h1' || tag === 'h2' || tag === 'h3';
      const isItalic = italic || tag === 'em'     || tag === 'i';
      const sz = tag === 'h1' ? 13 : tag === 'h2' ? 11 : tag === 'h3' ? 10 : size;

      if (tag === 'br') { segments.push({ newline: true }); return; }
      if (tag === 'li') { segments.push({ text: '• ', bold: false, italic: false, size }); }
      node.childNodes.forEach((c) => walk(c, isBold, isItalic, sz));
      if (['p','div','li','h1','h2','h3'].includes(tag)) {
        segments.push({ newline: true });
      }
    }
  }

  div.childNodes.forEach((c) => walk(c, false, false, null));
  while (segments.length && segments[segments.length - 1].newline) segments.pop();
  return segments.length ? segments : [{ text: '', bold: false, italic: false }];
}

// Renderiza segmentos no PDF. Retorna Y final.
function drawHtmlText(doc, html, x, startY, maxW, baseSz, baseColor, lineH) {
  const segments = parseHtmlToSegments(html);
  let curX = x;
  let curY = startY;

  const setS = (bold, italic) => {
    const w = bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal');
    doc.setFont('helvetica', w);
  };

  segments.forEach((seg) => {
    if (seg.newline) {
      curX = x;
      curY += lineH;
      return;
    }
    const sz = seg.size || baseSz;
    setS(seg.bold, seg.italic);
    doc.setTextColor(...baseColor);
    doc.setFontSize(sz);

    // Word-wrap dentro do segmento
    const words = seg.text.split(/(\s+)/);
    words.forEach((word) => {
      if (!word) return;
      const ww = doc.getTextWidth(word);
      if (curX + ww > x + maxW && curX > x) {
        curX = x;
        curY += lineH;
      }
      doc.text(word, curX, curY);
      curX += ww;
    });
  });

  return curY;
}

const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Trecho de HTML que só tem marcação vazia não gera espaço no PDF
const hasVisibleText = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .trim().length > 0;

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
  const FOOTER_H = 20;

  // ── Constantes de layout ──
  const LH       = cfg.line_height_content ?? 4.5;
  const SH       = 5;
  const SEC_GAP  = 4;
  const PARA_GAP = 2;

  const setFill   = (rgb) => doc.setFillColor(...rgb);
  const setStroke = (rgb) => doc.setDrawColor(...rgb);
  const setTxt    = (rgb) => doc.setTextColor(...rgb);
  const setFont   = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };

  setFill(P.pageBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // ── HEADER — cabeçalho configurado (imagem à esquerda, texto à direita) ──
  const layout = await loadDocLayout({ fallbackImageUrl: cfg.logo_url });
  const headerH = drawDocHeader(doc, layout, { x: ML, y: 5, width: CW });
  const headerLineY = 5 + Math.max(headerH, 16) + 5;
  setFill(P.green); doc.rect(ML, headerLineY, CW, 0.7, 'F');

  // ── Dados do orçamento: cliente, modelo e blocos por categoria ──
  const [client, template, blocksCfg, categories] = await Promise.all([
    quote.client_id
      ? base44.entities.Client.get(quote.client_id).catch(() => null)
      : Promise.resolve(null),
    loadQuoteTemplate(),
    loadQuoteBlocks(),
    quoteCategories(quote),
  ]);

  const ctx = {
    ...(await loadDocumentContext({ client: client || undefined })),
    ...buildQuoteVariables(quote),
  };

  setFont('bold', 12); setTxt(P.purple);
  doc.text(cfg.document_title || 'PROPOSTA COMERCIAL', ML, headerLineY + 8);
  setFont('normal', 7.5); setTxt(P.textSub);
  doc.text(
    'Nº ' + (quote.quote_number || '—') +
      '  ·  Data: ' + (ctx.quote_date || '—') +
      '  ·  Válida até: ' + (ctx.quote_valid_until || '—'),
    ML,
    headerLineY + 14
  );

  const secGap = cfg.section_content_gap ?? 3;

  // ── Helper: cabeçalho de seção ──
  const sectionHead = (label, y) => {
    setFill([246, 241, 251]); doc.rect(ML, y, CW, SH, 'F');
    setFill(P.purple); doc.rect(ML, y, 2.5, SH, 'F');
    setFont('bold', 8.5); setTxt(P.purple);
    doc.text(label, ML + 5, y + 3.6);
    return y + SH + secGap;
  };

  // ── BLOCO: dados do cliente ──
  const drawClientBlock = (y) => {
    let yy = sectionHead('DADOS DO CLIENTE', y);
    const LBL_A = ML + 2, VAL_A = ML + 27;
    const LBL_B = ML + CW / 2 + 2, VAL_B = ML + CW / 2 + 27;
    const HALF_VAL_W = CW / 2 - 30;

    [
      [['Nome', quote.client_name || '—'], ['CPF', quote.client_cpf || '—']],
      [['Telefone', quote.client_phone || '—'], ['E-mail', quote.client_email || '—']],
    ].forEach(([left, right]) => {
      setFont('bold', 7); setTxt(P.textSub);
      doc.text(left[0] + ':', LBL_A, yy);
      doc.text(right[0] + ':', LBL_B, yy);
      setFont('normal', 8); setTxt(P.textMain);
      doc.text(doc.splitTextToSize(String(left[1]), HALF_VAL_W)[0], VAL_A, yy);
      doc.text(doc.splitTextToSize(String(right[1]), HALF_VAL_W)[0], VAL_B, yy);
      yy += LH + 1;
    });
    yy += 1;
    setFill(P.divider); doc.rect(ML, yy, CW, 0.2, 'F');
    return yy + SEC_GAP;
  };

  // ── BLOCO: itens do orçamento ──
  const drawItemsBlock = (y) => {
    let yy = sectionHead('ITENS DO ORÇAMENTO', y);
    const TC = { desc: { x: ML, w: 100 }, qty: { x: ML + 102, w: 14 }, unit: { x: ML + 118, w: 28 } };
    const TR = PAGE_W - MR, TH = 6;

    setFill(P.purple); doc.rect(ML, yy, CW, TH, 'F');
    setFont('bold', 8); setTxt(P.white);
    doc.text(cfg.table_col_desc || 'Descrição', TC.desc.x + 3, yy + 4.2);
    doc.text(cfg.table_col_qty || 'Qtd', TC.qty.x + TC.qty.w / 2, yy + 4.2, { align: 'center' });
    doc.text(cfg.table_col_unit || 'Valor Unit.', TC.unit.x + TC.unit.w - 1, yy + 4.2, { align: 'right' });
    doc.text(cfg.table_col_total || 'Total', TR - 2, yy + 4.2, { align: 'right' });
    yy += TH;

    let zebra = false;
    (quote.items || []).forEach((item) => {
      const nameLines = doc.splitTextToSize(item.product_name || '—', TC.desc.w - 4);
      const rowH = Math.max(6, nameLines.length * LH + 2);
      if (zebra) { setFill([245, 243, 248]); doc.rect(ML, yy, CW, rowH, 'F'); }
      setFont('normal', 8); setTxt(P.textMain);
      doc.text(nameLines, TC.desc.x + 3, yy + 4.2);
      doc.text(String(item.quantity || 1), TC.qty.x + TC.qty.w / 2, yy + 4.2, { align: 'center' });
      doc.text(BRL(item.unit_price), TC.unit.x + TC.unit.w - 1, yy + 4.2, { align: 'right' });
      doc.text(BRL(item.total), TR - 2, yy + 4.2, { align: 'right' });
      setFill([220, 215, 230]); doc.rect(ML, yy + rowH - 0.2, CW, 0.2, 'F');
      yy += rowH; zebra = !zebra;
    });
    setFill(P.purple); doc.rect(ML, yy, CW, 0.4, 'F');
    return yy + SEC_GAP;
  };

  // ── BLOCO: resumo financeiro (à vista / parcelado) ──
  const drawFinanceBlock = (y) => {
    let yy = sectionHead('RESUMO FINANCEIRO', y);
    const hasDsc = (quote.discount || 0) > 0;
    const totalAVista = quote.total;
    const nInst = cfg.payment_installments || 18;
    const inst = (quote.subtotal > 0 ? quote.subtotal : quote.total) / nInst;
    const instLabel = (cfg.payment_installments_label || 'Parcelamento em até {n}×').replace('{n}', nInst);

    const OPT_W = CW / 2 - 3, OPT_X1 = ML, OPT_X2 = ML + OPT_W + 6;
    const OPT_HEAD_H = 6;
    const INNER_PAD = 3;
    const ROW_H = LH + 1.5;
    const DIV_GAP = 2;
    const VAL_H = 6;
    const BOT_PAD = 2;
    const rowsA = hasDsc ? 2 : 1;
    const OPT_BODY_H = Math.max(
      INNER_PAD + rowsA * ROW_H + DIV_GAP + VAL_H + BOT_PAD,
      INNER_PAD + 2 * ROW_H + DIV_GAP + VAL_H + BOT_PAD
    );
    const OPT_H = OPT_HEAD_H + OPT_BODY_H;

    // Box À Vista
    setFill(P.green); doc.roundedRect(OPT_X1, yy, OPT_W, OPT_HEAD_H, 1.5, 1.5, 'F');
    setFont('bold', 8.5); setTxt(P.white);
    doc.text(cfg.payment_label_cash || 'À VISTA', OPT_X1 + OPT_W / 2, yy + 4.2, { align: 'center' });
    setFill([250, 252, 243]); setStroke([180, 210, 60]); doc.setLineWidth(0.3);
    doc.roundedRect(OPT_X1, yy + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.5, 1.5, 'FD');
    const AX = OPT_X1 + OPT_W - 4; let AY = yy + OPT_HEAD_H + INNER_PAD;
    setFont('bold', 7); setTxt(P.textSub); doc.text('Subtotal:', OPT_X1 + 4, AY);
    setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), AX, AY, { align: 'right' });
    AY += ROW_H;
    if (hasDsc) {
      const pct = quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) + '%' : '';
      setFont('bold', 7); setTxt(P.textSub); doc.text('Desconto ' + (pct ? '(' + pct + ')' : '') + ':', OPT_X1 + 4, AY);
      setFont('bold', 8); setTxt([80, 140, 0]); doc.text('- ' + BRL(quote.discount), AX, AY, { align: 'right' });
      AY += ROW_H;
    }
    setFill([180, 210, 60]); doc.rect(OPT_X1 + 3, AY + 1, OPT_W - 6, 0.25, 'F');
    AY += DIV_GAP + 4;
    setFont('bold', 11); setTxt([50, 100, 0]); doc.text(BRL(totalAVista), OPT_X1 + OPT_W / 2, AY, { align: 'center' });

    // Box Parcelado
    setFill(P.purple); doc.roundedRect(OPT_X2, yy, OPT_W, OPT_HEAD_H, 1.5, 1.5, 'F');
    setFont('bold', 8.5); setTxt(P.white);
    doc.text(cfg.payment_label_card || 'PARCELADO', OPT_X2 + OPT_W / 2, yy + 4.2, { align: 'center' });
    setFill([250, 247, 254]); setStroke([210, 200, 225]); doc.setLineWidth(0.3);
    doc.roundedRect(OPT_X2, yy + OPT_HEAD_H, OPT_W, OPT_BODY_H, 1.5, 1.5, 'FD');
    const BBX = OPT_X2 + OPT_W - 4; let BY = yy + OPT_HEAD_H + INNER_PAD;
    setFont('bold', 7); setTxt(P.textSub); doc.text('Valor total:', OPT_X2 + 4, BY);
    setFont('normal', 8); setTxt(P.textMain); doc.text(BRL(quote.subtotal), BBX, BY, { align: 'right' });
    BY += ROW_H;
    setFont('bold', 7); setTxt(P.textSub); doc.text(instLabel + ':', OPT_X2 + 4, BY);
    setFill([210, 200, 225]); doc.rect(OPT_X2 + 3, BY + ROW_H + 1, OPT_W - 6, 0.25, 'F');
    BY += ROW_H + DIV_GAP + 4;
    setFont('bold', 11); setTxt(P.purple); doc.text(BRL(inst) + '/mês', OPT_X2 + OPT_W / 2, BY, { align: 'center' });

    return yy + OPT_H + SEC_GAP;
  };

  // ── BLOCO: garantias / acompanhamento por categoria de produto ──
  const resolvedBlocks = resolveCategoryBlocks(blocksCfg, categories);
  const drawCategoryBlock = (y, title, key) => {
    const entries = resolvedBlocks
      .map((block) => ({ label: block.label, html: block[key] }))
      .filter((entry) => hasVisibleText(entry.html));
    if (!entries.length) return y;

    let yy = sectionHead(title, y);
    const seen = new Set();
    entries.forEach((entry) => {
      if (seen.has(entry.html)) return;
      seen.add(entry.html);
      if (resolvedBlocks.length > 1 && entry.label) {
        setFont('bold', 8); setTxt(P.purple);
        doc.text(entry.label, ML + 2, yy);
        yy += LH;
      }
      yy = drawHtmlText(doc, entry.html, ML + 2, yy, CW - 4, 8, P.textMain, LH) + PARA_GAP;
    });
    return yy + SEC_GAP;
  };

  const drawBlocks = {
    dados_cliente: (y) => drawClientBlock(y),
    tabela_itens: (y) => drawItemsBlock(y),
    resumo_financeiro: (y) => drawFinanceBlock(y),
    garantias: (y) => drawCategoryBlock(y, 'PRAZOS DE GARANTIA', 'warranty_text'),
    acompanhamento: (y) => drawCategoryBlock(y, 'ACOMPANHAMENTO VITALÍCIO', 'followup_text'),
  };

  // ── Corpo do documento: modelo de orçamento (Configurações > Modelos) ──
  let Y = headerLineY + 20;
  const content = fillDocumentVariables(template?.content || DEFAULT_CONTENT_HTML, ctx);

  splitQuoteContent(content).forEach((part) => {
    if (part.block) {
      const draw = drawBlocks[part.block];
      if (draw) Y = draw(Y);
      return;
    }
    const html = stripUnresolvedVariables(part.html);
    if (!hasVisibleText(html)) return;
    Y = drawHtmlText(doc, html, ML + 2, Y, CW - 4, 8, P.textMain, LH) + SEC_GAP;
  });

  // ── ASSINATURA — fixada logo acima do rodapé ──
  const SIG_W = 55, SIG_X = PAGE_W - MR - SIG_W;
  const SIG_Y = PAGE_H - FOOTER_H - 14;
  setFill(P.textSub); doc.rect(SIG_X, SIG_Y, SIG_W, 0.3, 'F');
  setFont('bold', 8.5); setTxt(P.textMain);
  doc.text(cfg.signer_name || 'Fabio Malveira', SIG_X + SIG_W / 2, SIG_Y + LH, { align: 'center' });
  setFont('normal', 7); setTxt(P.textSub);
  doc.text(cfg.signer_role || 'Comercial Sonatta', SIG_X + SIG_W / 2, SIG_Y + LH * 2, { align: 'center' });

  // ── FOOTER — contagem de páginas | texto + barra verde ──
  drawDocFooter(doc, layout, { x: ML, y: PAGE_H - 13, width: CW, page: 1, total: 1 });

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
      title="Gerar PDF do orçamento"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}