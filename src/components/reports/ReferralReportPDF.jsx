import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { base44 } from '@/api/base44Client';

const DEFAULT_PDF_CFG = {
  logo_url: 'https://media.base44.com/images/public/694e93aa7609bf14847de917/073de81ba_SONATTA_CARDS-10.png',
  address: 'Edif. Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007, Manaus – AM',
  phone: '(92) 98464-5343',
  email: 'atendimento@sonatta.store',
  website: 'sonatta.store',
  instagram: '@sonatta.store',
};

const P = {
  purple:  [98, 42, 126],
  green:   [136, 188, 7],
  textMain:[32, 31, 28],
  textSub: [66, 63, 51],
  white:   [255, 255, 255],
  rowAlt:  [248, 245, 252],
  totalBg: [237, 228, 248],
};

const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDate = (raw) => {
  if (!raw) return '—';
  try {
    const s = String(raw);
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '—';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  } catch { return '—'; }
};

function loadImageAsBase64(url) {
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

async function loadPdfCfg() {
  try {
    const all = await base44.entities.AppSettings.list();
    const rec = all.find(r => r.setting_key === 'quote_pdf_config');
    if (rec?.setting_value) return { ...DEFAULT_PDF_CFG, ...rec.setting_value };
  } catch { /* usa padrão */ }
  return DEFAULT_PDF_CFG;
}

// Gera o PDF do relatório de repasse.
// rows: array de { professional, specialty, patient, saleDate, totalValue, referralValue }
// filters: { dateStart, dateEnd, professionalName }
export async function buildReferralPDF(rows, filters) {
  const cfg = await loadPdfCfg();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210, PAGE_H = 297, ML = 15, MR = 15;
  const CW = PAGE_W - ML - MR;
  const FOOTER_H = 20;
  const MAX_Y = PAGE_H - FOOTER_H;

  // Logo
  let logoB64 = null;
  let logoW = 50, logoH = 16;
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

  // ── Cabeçalho (igual orçamento) ──
  const drawHeader = () => {
    if (logoB64) {
      doc.addImage(logoB64, 'PNG', ML, 5, logoW, logoH, undefined, 'NONE');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...P.purple);
      doc.text('SONATTA', ML, 17);
    }
    // Título do relatório à direita
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...P.purple);
    doc.text('REPASSE DE INDICAÇÃO (10%)', PAGE_W - MR, 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...P.textSub);
    doc.text('Relatório gerado em ' + fmtDate(new Date().toISOString()), PAGE_W - MR, 14, { align: 'right' });
    // Linha verde
    doc.setFillColor(...P.green);
    doc.rect(ML, headerLineY, CW, 0.7, 'F');
  };

  // ── Rodapé (igual orçamento) ──
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

  // ── Subtítulo com filtros ──
  const drawFilters = (startY) => {
    let y = startY;
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
    parts.forEach((line, i) => {
      doc.text(line, ML, y + i * 4);
    });
    return y + parts.length * 4 + 4;
  };

  // ── Tabela ──
  const COLS = [
    { key: 'professional', label: 'Profissional', w: 42 },
    { key: 'specialty',    label: 'Especialidade', w: 38 },
    { key: 'patient',      label: 'Paciente',     w: 42 },
    { key: 'saleDate',     label: 'Data Venda',    w: 22, align: 'center' },
    { key: 'totalValue',   label: 'Valor Total',  w: 28, align: 'right' },
    { key: 'referralValue',label: 'Repasse 10%',  w: 28, align: 'right' },
  ];
  const totalW = COLS.reduce((s, c) => s + c.w, 0);
  const tableX = ML + (CW - totalW) / 2;

  const drawTableHeader = (y) => {
    doc.setFillColor(...P.purple);
    doc.rect(tableX, y, totalW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...P.white);
    let cx = tableX;
    COLS.forEach(c => {
      const opts = c.align === 'right' ? { align: 'right' } : c.align === 'center' ? { align: 'center' } : {};
      const tx = c.align === 'right' ? cx + c.w - 2 : c.align === 'center' ? cx + c.w / 2 : cx + 2;
      doc.text(c.label, tx, y + 4.8, opts);
      cx += c.w;
    });
    return y + 7;
  };

  const drawRow = (row, y, zebra) => {
    if (zebra) {
      doc.setFillColor(...P.rowAlt);
      doc.rect(tableX, y, totalW, 6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...P.textMain);
    let cx = tableX;
    COLS.forEach(c => {
      let val = row[c.key];
      if (c.key === 'specialty') val = (val || '-').replace(/_/g, ' ');
      const opts = c.align === 'right' ? { align: 'right' } : c.align === 'center' ? { align: 'center' } : {};
      const tx = c.align === 'right' ? cx + c.w - 2 : c.align === 'center' ? cx + c.w / 2 : cx + 2;
      // Trunca texto longo para caber na coluna
      let txt = String(val ?? '');
      const maxChars = Math.floor(c.w / 1.8);
      if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';
      doc.text(txt, tx, y + 4.2, opts);
      cx += c.w;
    });
    return y + 6;
  };

  const drawTotals = (y, totals) => {
    doc.setFillColor(...P.totalBg);
    doc.rect(tableX, y, totalW, 8, 'F');
    doc.setFillColor(...P.purple);
    doc.rect(tableX, y, totalW, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...P.purple);
    // Label "TOTAL" ocupando as 4 primeiras colunas
    const labelW = COLS.slice(0, 4).reduce((s, c) => s + c.w, 0);
    doc.text('TOTAL (' + totals.count + ' venda' + (totals.count !== 1 ? 's' : '') + ')', tableX + labelW / 2, y + 5.3, { align: 'center' });
    // Valor Total
    doc.setTextColor(...P.textMain);
    doc.text(BRL(totals.totalValue), tableX + labelW + COLS[4].w - 2, y + 5.3, { align: 'right' });
    // Repasse
    doc.setTextColor(...[80, 140, 0]);
    doc.text(BRL(totals.referralValue), tableX + labelW + COLS[4].w + COLS[5].w - 2, y + 5.3, { align: 'right' });
    return y + 8;
  };

  // ── Montagem ──
  drawHeader();
  drawFooter();
  let y = drawFilters(contentStartY);
  y = drawTableHeader(y);

  let zebra = false;
  const totals = { count: 0, totalValue: 0, referralValue: 0 };

  for (const row of rows) {
    totals.count++;
    totals.totalValue += row.totalValue || 0;
    totals.referralValue += row.referralValue || 0;

    if (y + 6 > MAX_Y - 12) {
      // Quebra de página
      doc.addPage();
      drawHeader();
      drawFooter();
      y = contentStartY;
      y = drawTableHeader(y);
      zebra = false;
    }
    y = drawRow(row, y, zebra);
    zebra = !zebra;
  }

  // Linha de totais
  if (y + 8 > MAX_Y) {
    doc.addPage();
    drawHeader();
    drawFooter();
    y = contentStartY;
  }
  drawTotals(y, totals);

  const fileName = 'repasse_indicacao_' + new Date().toISOString().split('T')[0] + '.pdf';
  doc.save(fileName);
}

export default function ReferralReportPDFButton({ rows, filters }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!rows || rows.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }
    setLoading(true);
    try {
      await buildReferralPDF(rows, filters);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handle} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
      Exportar PDF
    </Button>
  );
}