// Cabeçalho e rodapé usados nos PDFs gerados pelo sistema.
// A configuração é a mesma editada em Configurações → Modelos → Cabeçalho e Rodapé.
import { base44 } from '@/api/base44Client';
import { loadImageAsBase64 } from '@/components/reports/pdfHelpers';

export const DOC_LAYOUT_KEY = 'document_header_footer';

const BRAND_GREEN = [164, 210, 51];
const TEXT_COLOR = [80, 80, 80];
const BAR_H = 3;    // ≈ 10px na tela
const LINE_H = 4;   // altura de cada linha de texto (mm)

// Converte o texto rico do editor em linhas simples para o PDF
export function htmlToLines(html) {
  if (!html) return [];
  const withBreaks = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const el = document.createElement('textarea');
  el.innerHTML = withBreaks;

  return el.value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Lê a configuração salva. Se o cabeçalho não tiver imagem, usa a informada como reserva.
export async function loadDocLayout({ fallbackImageUrl } = {}) {
  let saved = {};
  try {
    const res = await base44.entities.AppSettings.filter({ setting_key: DOC_LAYOUT_KEY });
    saved = (res.items || [])[0]?.setting_value || {};
  } catch (e) {
    saved = {};
  }

  const imageUrl = saved.header_image_url || fallbackImageUrl;
  let image = null;
  if (imageUrl) {
    const loaded = await loadImageAsBase64(imageUrl);
    if (loaded?.dataUrl && loaded.h) image = { dataUrl: loaded.dataUrl, ratio: loaded.w / loaded.h };
  }

  return {
    image,
    headerLines: htmlToLines(typeof saved.header === 'string' ? saved.header : saved.header_text),
    footerLines: htmlToLines(typeof saved.footer === 'string' ? saved.footer : saved.footer_text),
  };
}

// Cabeçalho: imagem à esquerda e texto à direita. Devolve a altura usada (mm).
export function drawDocHeader(pdf, layout, { x, y, width, logoMaxH = 16, logoMaxW = 50, fontSize = 7.5 }) {
  if (!layout) return 0;

  let height = 0;

  if (layout.image) {
    let w = logoMaxH * layout.image.ratio;
    let h = logoMaxH;
    if (w > logoMaxW) {
      w = logoMaxW;
      h = w / layout.image.ratio;
    }
    pdf.addImage(layout.image.dataUrl, 'PNG', x, y, w, h, undefined, 'NONE');
    height = h;
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);
  const lines = [];
  (layout.headerLines || []).forEach((line) => {
    lines.push(...pdf.splitTextToSize(line, width * 0.55));
  });

  if (lines.length) {
    pdf.setTextColor(...TEXT_COLOR);
    const shown = lines.slice(0, 3);
    shown.forEach((line, i) => {
      pdf.text(line, x + width, y + 4 + i * LINE_H, { align: 'right' });
    });
    height = Math.max(height, 4 + shown.length * LINE_H);
  }

  return height;
}

// Rodapé: contagem de páginas à esquerda, texto à direita e barra verde abaixo
export function drawDocFooter(pdf, layout, { x, y, width, page = 1, total = 1 }) {
  if (!layout) return;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...TEXT_COLOR);
  pdf.text(`Página ${page}/${total}`, x, y);

  const lines = (layout.footerLines || []).slice(0, 3);
  lines.forEach((line, i) => {
    pdf.text(line, x + width, y + i * LINE_H, { align: 'right' });
  });

  pdf.setFillColor(...BRAND_GREEN);
  pdf.rect(x, y + Math.max(lines.length * LINE_H, LINE_H) + 1.5, width, BAR_H, 'F');
}