import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  P, BRL, buildFileName, fmtDate, drawTableHeader, drawRow,
} from '@/components/reports/pdfHelpers';
import { loadDocLayout, drawDocHeader, drawDocFooter } from '@/lib/pdfLetterhead';

// Gera o PDF do relatório de repasse.
// rows: array de { professional, specialty, patient, saleDate, totalValue, baseValue, referralValue }
// filters: { dateStart, dateEnd, professionalName, referralPercent }
export async function buildReferralPDF(rows, filters) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 15;
  const MR = 15;
  const CW = PAGE_W - ML - MR;
  const FOOTER_Y = PAGE_H - 24;
  const MAX_Y = PAGE_H - 30;

  // Cabeçalho e rodapé configurados em Configurações → Modelos (mesmos do modelo de documentos)
  const layout = await loadDocLayout();
  const headerH = Math.max(drawDocHeader(doc, layout, { x: ML, y: 6, width: CW }), 16);
  const headerLineY = 6 + headerH + 5;
  const contentStartY = headerLineY + 14;

  const paintHeader = () => {
    drawDocHeader(doc, layout, { x: ML, y: 6, width: CW });
    doc.setFillColor(...P.green);
    doc.rect(ML, headerLineY, CW, 0.7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...P.purple);
    doc.text('REPASSE DE INDICAÇÃO', ML, headerLineY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...P.textSub);
    doc.text('Relatório gerado em ' + fmtDate(new Date().toISOString()), PAGE_W - MR, headerLineY + 8, { align: 'right' });
  };

  const drawFilters = (startY) => {
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

  // A tabela ocupa exatamente a mesma largura do cabeçalho e da linha verde
  const referralPercent = filters.referralPercent ?? 10;
  const COLS = [
    { key: 'patient',      label: 'Paciente',     w: 65 },
    { key: 'saleDate',     label: 'Data Venda',    w: 25, align: 'center' },
    { key: 'totalValue',   label: 'Valor Total',  w: 32, align: 'right' },
    { key: 'baseValue',    label: 'Base Líquida', w: 33, align: 'right' },
    { key: 'referralValue',label: `Repasse ${referralPercent}%`, w: 25, align: 'right' },
  ];
  const totalW = COLS.reduce((s, c) => s + c.w, 0);
  const tableX = ML;

  const formatter = {
    specialty: (v) => (v || '-').replace(/_/g, ' '),
    totalValue: (v) => BRL(v),
    baseValue: (v) => BRL(v),
    referralValue: (v) => BRL(v),
  };

  // Borda direita de cada coluna, para alinhar os totais
  const rightEdge = COLS.reduce((acc, c) => {
    acc.push((acc.length ? acc[acc.length - 1] : tableX) + c.w);
    return acc;
  }, []);

  const drawTotals = (y, totals) => {
    doc.setFillColor(...P.totalBg);
    doc.rect(tableX, y, totalW, 8, 'F');
    doc.setFillColor(...P.purple);
    doc.rect(tableX, y, totalW, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...P.purple);
    const labelW = COLS[0].w + COLS[1].w;
    doc.text('TOTAL (' + totals.count + ' venda' + (totals.count !== 1 ? 's' : '') + ')', tableX + labelW / 2, y + 5.3, { align: 'center' });
    doc.setTextColor(...P.textMain);
    doc.text(BRL(totals.totalValue), rightEdge[2] - 2, y + 5.3, { align: 'right' });
    doc.text(BRL(totals.baseValue), rightEdge[3] - 2, y + 5.3, { align: 'right' });
    doc.setTextColor(...[80, 140, 0]);
    doc.text(BRL(totals.referralValue), rightEdge[4] - 2, y + 5.3, { align: 'right' });
    return y + 8;
  };

  paintHeader();
  let y = drawFilters(contentStartY);
  y = drawTableHeader(doc, tableX, y, COLS, totalW);

  let zebra = false;
  const totals = { count: 0, totalValue: 0, baseValue: 0, referralValue: 0 };

  for (const row of rows) {
    totals.count++;
    totals.totalValue += row.totalValue || 0;
    totals.baseValue += row.baseValue || 0;
    totals.referralValue += row.referralValue || 0;

    if (y + 6 > MAX_Y - 12) {
      doc.addPage();
      paintHeader();
      y = drawTableHeader(doc, tableX, contentStartY, COLS, totalW);
      zebra = false;
    }
    y = drawRow(doc, tableX, y, row, COLS, totalW, zebra, formatter);
    zebra = !zebra;
  }

  if (y + 8 > MAX_Y) {
    doc.addPage();
    paintHeader();
    y = contentStartY;
  }
  drawTotals(y, totals);

  // Rodapé configurado em todas as páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawDocFooter(doc, layout, { x: ML, y: FOOTER_Y, width: CW, page: i, total: pageCount });
  }

  doc.save(buildFileName('repasse_indicacao', filters));
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