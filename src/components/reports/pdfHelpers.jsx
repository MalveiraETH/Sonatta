import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';

export const DEFAULT_PDF_CFG = {
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  phone: '(92) 98464-5343',
  email: 'atendimento@sonatta.store',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
};

export const P = {
  purple:  [98, 42, 126],
  green:   [136, 188, 7],
  textMain:[32, 31, 28],
  textSub: [66, 63, 51],
  white:   [255, 255, 255],
  rowAlt:  [248, 245, 252],
  totalBg: [237, 228, 248],
};

export const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export const fmtDate = (raw) => {
  if (!raw) return '—';
  try {
    const s = String(raw);
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '—';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  } catch { return '—'; }
};

const MESES = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

export function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

export async function loadPdfCfg() {
  try {
    const all = await base44.entities.AppSettings.list();
    const rec = all.find(r => r.setting_key === 'quote_pdf_config');
    if (rec?.setting_value) return { ...DEFAULT_PDF_CFG, ...rec.setting_value };
  } catch { /* usa padrão */ }
  return DEFAULT_PDF_CFG;
}

const slugify = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'todos';

// Extrai mês/ano do filtro: prioriza dateStart, senão dateEnd, senão mês atual.
export function extractMonthYear(filters) {
  const ref = filters.dateStart || filters.dateEnd || new Date().toISOString();
  const d = new Date(String(ref).match(/^\d{4}-\d{2}-\d{2}$/) ? ref + 'T12:00:00' : ref);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { month: MESES[now.getMonth()], year: now.getFullYear() };
  }
  return { month: MESES[d.getMonth()], year: d.getFullYear() };
}

// Monta nome de arquivo padronizado: <prefix>_<prof>_<mes>_<ano>.pdf
export function buildFileName(prefix, filters) {
  const prof = slugify(filters.professionalName && filters.professionalName !== 'Todos'
    ? filters.professionalName : 'todos');
  const { month, year } = extractMonthYear(filters);
  return `${prefix}_${prof}_${month}_${year}.pdf`;
}

// Prepara o documento PDF com logo carregado e retorna utilidades de cabeçalho/rodapé.
export async function initPdfDoc(title) {
  const cfg = await loadPdfCfg();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210, PAGE_H = 297, ML = 15, MR = 15;
  const CW = PAGE_W - ML - MR;
  const FOOTER_H = 20;
  const MAX_Y = PAGE_H - FOOTER_H;

  let logoB64 = null, logoW = 50, logoH = 16;
  if (cfg.logo_url) {
    const res = await loadImageAsBase64(cfg.logo_url);
    logoB64 = res?.dataUrl || null;
    if (logoB64) {
      const ratio = res.w / res.h;
      const LOGO_MAX_H = 16, LOGO_MAX_W = 50;
      logoW = LOGO_MAX_H * ratio;
      logoH = LOGO_MAX_H;
      if (logoW > LOGO_MAX_W) { logoW = LOGO_MAX_W; logoH = logoW / ratio; }
    }
  }

  const headerLineY = 5 + logoH + 6;
  const contentStartY = headerLineY + 8;

  const drawHeader = () => {
    if (logoB64) {
      doc.addImage(logoB64, 'PNG', ML, 5, logoW, logoH, undefined, 'NONE');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...P.purple);
      doc.text('SONATTA', ML, 17);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...P.purple);
    doc.text(title, PAGE_W - MR, 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...P.textSub);
    doc.text('Relatório gerado em ' + fmtDate(new Date().toISOString()), PAGE_W - MR, 14, { align: 'right' });
    doc.setFillColor(...P.green);
    doc.rect(ML, headerLineY, CW, 0.7, 'F');
  };

  const drawFooter = () => {
    const FY = PAGE_H - 16;
    doc.setFillColor(...P.green);
    doc.rect(ML, FY, CW, 0.6, 'F');
    const FL = FY + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...P.textSub);
    doc.text(cfg.address || '', ML, FL);
    doc.text((cfg.phone || '') + '  ·  ' + (cfg.email || ''), ML, FL + 4.5);
    doc.setTextColor(...P.purple);
    doc.text((cfg.website || '') + '  ·  ' + (cfg.instagram || ''), PAGE_W - MR, FL, { align: 'right' });
  };

  const drawFilters = (startY, filters) => {
    const parts = [];
    if (filters.dateStart || filters.dateEnd) {
      const ini = filters.dateStart ? fmtDate(filters.dateStart) : 'Início';
      const fim = filters.dateEnd ? fmtDate(filters.dateEnd) : 'Hoje';
      parts.push('Período: ' + ini + ' a ' + fim);
    }
    if (filters.professionalName && filters.professionalName !== 'Todos') {
      parts.push('Profissional: ' + filters.professionalName);
    }
    if (parts.length === 0) parts.push('Todos os registros');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...P.textSub);
    parts.forEach((line, i) => doc.text(line, ML, startY + i * 4));
    return startY + parts.length * 4 + 4;
  };

  return { doc, cfg, PAGE_W, PAGE_H, ML, MR, CW, MAX_Y, contentStartY, drawHeader, drawFooter, drawFilters };
}

// Desenha cabeçalho de tabela genérico
export function drawTableHeader(doc, tableX, y, cols, totalW) {
  doc.setFillColor(...P.purple);
  doc.rect(tableX, y, totalW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...P.white);
  let cx = tableX;
  cols.forEach(c => {
    const opts = c.align === 'right' ? { align: 'right' } : c.align === 'center' ? { align: 'center' } : {};
    const tx = c.align === 'right' ? cx + c.w - 2 : c.align === 'center' ? cx + c.w / 2 : cx + 2;
    doc.text(c.label, tx, y + 4.8, opts);
    cx += c.w;
  });
  return y + 7;
}

// Desenha uma linha de tabela genérica
export function drawRow(doc, tableX, y, row, cols, totalW, zebra, formatter) {
  if (zebra) {
    doc.setFillColor(...P.rowAlt);
    doc.rect(tableX, y, totalW, 6, 'F');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...P.textMain);
  let cx = tableX;
  cols.forEach(c => {
    let val = row[c.key];
    if (formatter && formatter[c.key]) val = formatter[c.key](val);
    const opts = c.align === 'right' ? { align: 'right' } : c.align === 'center' ? { align: 'center' } : {};
    const tx = c.align === 'right' ? cx + c.w - 2 : c.align === 'center' ? cx + c.w / 2 : cx + 2;
    let txt = String(val ?? '');
    const maxChars = Math.floor(c.w / 1.8);
    if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';
    doc.text(txt, tx, y + 4.2, opts);
    cx += c.w;
  });
  return y + 6;
}