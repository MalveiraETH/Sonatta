// Geração do PDF de um documento do paciente usando o cabeçalho e o rodapé
// configurados em Configurações → Modelos. O conteúdo é rasterizado em alta
// resolução e distribuído entre as páginas, evitando cortar linhas ao meio.
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { loadDocLayout, drawDocHeader, drawDocFooter } from '@/lib/pdfLetterhead';
import { stripUnresolvedVariables } from '@/lib/fillDocumentVariables';
import { openWhatsApp } from '@/utils/whatsapp';

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 14;
const MR = 14;
const CW = PAGE_W - ML - MR;
const HEADER_Y = 6;
const HEADER_MIN_H = 16;
const FOOTER_Y = 284;
const RENDER_WIDTH = 760;
const SCALE = 2;

const PDF_STYLE = `
  .doc-pdf-body { font-family: Helvetica, Arial, sans-serif; color: #1f2937; font-size: 15px; line-height: 1.7; word-break: break-word; }
  .doc-pdf-body h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 .5em; }
  .doc-pdf-body h2 { font-size: 1.3em; font-weight: 700; margin: 0 0 .5em; }
  .doc-pdf-body h3 { font-size: 1.1em; font-weight: 700; margin: 0 0 .5em; }
  .doc-pdf-body p { margin: 0 0 .7em; }
  .doc-pdf-body ul, .doc-pdf-body ol { margin: 0 0 .7em 1.4em; }
  .doc-pdf-body table { border-collapse: collapse; width: 100%; }
  .doc-pdf-body table th, .doc-pdf-body table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 14px; }
  .doc-pdf-body th { background: #F1ECFA; font-weight: 600; text-align: left; }
`;

async function renderContentCanvas(html) {
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;top:0;left:-10000px;width:${RENDER_WIDTH}px;background:#ffffff;`;

  const style = document.createElement('style');
  style.textContent = PDF_STYLE;

  const body = document.createElement('div');
  body.className = 'doc-pdf-body';
  body.innerHTML = stripUnresolvedVariables(html) || '<p></p>';

  holder.appendChild(style);
  holder.appendChild(body);
  document.body.appendChild(holder);

  try {
    return await html2canvas(body, {
      scale: SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
  } finally {
    document.body.removeChild(holder);
  }
}

// Procura a linha em branco mais próxima acima do corte ideal para não
// dividir uma linha de texto entre duas páginas.
function findBreakRow(rows, width, idealY, minY) {
  for (let y = idealY; y > minY; y--) {
    const base = y * width * 4;
    let isBlank = true;
    for (let x = 0; x < width; x += 4) {
      const i = base + x * 4;
      if (rows[i] < 246 || rows[i + 1] < 246 || rows[i + 2] < 246) {
        isBlank = false;
        break;
      }
    }
    if (isBlank) return y;
  }
  return idealY;
}

export async function buildDocumentPdf({ html, layout }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const canvas = await renderContentCanvas(html);

  // Desenha o cabeçalho da 1ª página e mede a altura reservada
  const headerH = drawDocHeader(doc, layout, { x: ML, y: HEADER_Y, width: CW });
  const topY = HEADER_Y + Math.max(headerH, HEADER_MIN_H) + 5;
  const bottomY = FOOTER_Y - 6;
  const pxPerMM = canvas.width / CW;
  const maxSlicePx = Math.floor((bottomY - topY) * pxPerMM);

  let rows = null;
  try {
    rows = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    rows = null;
  }

  let offset = 0;
  let page = 0;

  while (offset < canvas.height) {
    const idealEnd = Math.min(offset + maxSlicePx, canvas.height);
    let end = idealEnd;
    if (rows && idealEnd < canvas.height) {
      const minY = Math.max(offset + Math.floor(maxSlicePx * 0.55), offset + 20);
      end = findBreakRow(rows, canvas.width, idealEnd, minY);
    }
    const sliceH = Math.max(1, end - offset);

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceH;
    const sctx = slice.getContext('2d');
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, slice.width, slice.height);
    sctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    if (page > 0) {
      doc.addPage();
      drawDocHeader(doc, layout, { x: ML, y: HEADER_Y, width: CW });
    }
    doc.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      ML,
      topY,
      CW,
      sliceH / pxPerMM,
      undefined,
      'FAST'
    );

    offset = end;
    page++;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawDocFooter(doc, layout, { x: ML, y: FOOTER_Y, width: CW, page: i, total: pageCount });
  }

  return doc;
}

export function sanitizeFileName(name) {
  return (
    String(name || 'documento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]+/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'documento'
  );
}

// Primeiro e último nome do cliente, usados para compor o nome do arquivo.
export function shortClientName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export async function generateDocumentPdf(html, title, clientName) {
  const layout = await loadDocLayout();
  const doc = await buildDocumentPdf({ html, layout });
  const base = [title, shortClientName(clientName)].filter(Boolean).join(' ');
  return { doc, fileName: `${sanitizeFileName(base)}.pdf` };
}

// Baixa no celular ou computador
export function downloadDocumentPdf(doc, fileName) {
  doc.save(fileName);
}

// Compartilhamento: usa o menu nativo (WhatsApp / WhatsApp Business) quando o
// dispositivo suporta arquivos; caso contrário baixa o PDF e abre a conversa.
export async function shareDocumentPdf(doc, fileName, { title, phone } = {}) {
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: title });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }

  doc.save(fileName);
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits) {
    openWhatsApp(`55${digits}`, `${title ? `${title}\n\n` : ''}Segue o documento em anexo.`);
  }
  return 'fallback';
}