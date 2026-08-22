import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  P, fmtDate, buildFileName, initPdfDoc, drawTableHeader, drawRow,
} from '@/components/reports/pdfHelpers';

const STATUS_LABEL = {
  teste_agendado: 'Agendado',
  em_teste: 'Em Teste',
  teste_estendido: 'Estendido',
  teste_finalizado: 'Finalizado',
  teste_pendente: 'Pendente',
};

// Gera o PDF do relatório de testes.
// rows: array de { testNumber, client, startDate, endDate, professional, referral, devices, status }
// filters: { dateStart, dateEnd, professionalName }
export async function buildTestsPDF(rows, filters) {
  const { doc, ML, CW, MAX_Y, contentStartY, drawHeader, drawFooter, drawFilters } =
    await initPdfDoc('RELATÓRIO DE TESTES');

  const COLS = [
    { key: 'client',      label: 'Paciente',     w: 90 },
    { key: 'startDate',   label: 'Início',       w: 30, align: 'center' },
    { key: 'endDate',     label: 'Fim',          w: 30, align: 'center' },
    { key: 'status',      label: 'Status',       w: 30 },
  ];
  const totalW = COLS.reduce((s, c) => s + c.w, 0);
  const tableX = ML + (CW - totalW) / 2;

  const formatter = {
    startDate: (v) => fmtDate(v),
    endDate: (v) => fmtDate(v),
    status: (v) => STATUS_LABEL[v] || v || '-',
  };

  const drawTotals = (y, totals) => {
    doc.setFillColor(...P.totalBg);
    doc.rect(tableX, y, totalW, 8, 'F');
    doc.setFillColor(...P.purple);
    doc.rect(tableX, y, totalW, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...P.purple);
    const labelW = COLS.slice(0, 3).reduce((s, c) => s + c.w, 0);
    doc.text('TOTAL DE TESTES: ' + totals.count, tableX + labelW / 2, y + 5.3, { align: 'center' });
    // Contagem por status na célula final
    doc.setTextColor(...P.textMain);
    const byStatus = totals.byStatus;
    const summary = Object.entries(byStatus)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => (STATUS_LABEL[k] || k) + ': ' + n)
      .join('  ');
    doc.setFontSize(7);
    doc.text(summary || '-', tableX + labelW + COLS[3].w - 2, y + 5.3, { align: 'right' });
    return y + 8;
  };

  drawHeader();
  drawFooter();
  let y = drawFilters(contentStartY, filters);
  y = drawTableHeader(doc, tableX, y, COLS, totalW);

  let zebra = false;
  const totals = { count: 0, byStatus: {} };

  for (const row of rows) {
    totals.count++;
    totals.byStatus[row.status] = (totals.byStatus[row.status] || 0) + 1;

    if (y + 6 > MAX_Y - 12) {
      doc.addPage();
      drawHeader();
      drawFooter();
      y = drawTableHeader(doc, tableX, contentStartY, COLS, totalW);
      zebra = false;
    }
    y = drawRow(doc, tableX, y, row, COLS, totalW, zebra, formatter);
    zebra = !zebra;
  }

  if (y + 8 > MAX_Y) {
    doc.addPage();
    drawHeader();
    drawFooter();
    y = contentStartY;
  }
  drawTotals(y, totals);

  doc.save(buildFileName('relatorio_testes', filters));
}

export default function TestsReportPDFButton({ rows, filters }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!rows || rows.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }
    setLoading(true);
    try {
      await buildTestsPDF(rows, filters);
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