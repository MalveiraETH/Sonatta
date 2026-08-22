import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  P, BRL, buildFileName, initPdfDoc, drawTableHeader, drawRow,
} from '@/components/reports/pdfHelpers';

// Gera o PDF do relatório de repasse.
// rows: array de { professional, specialty, patient, saleDate, totalValue, referralValue }
// filters: { dateStart, dateEnd, professionalName }
export async function buildReferralPDF(rows, filters) {
  const { doc, ML, CW, MAX_Y, contentStartY, drawHeader, drawFooter, drawFilters } =
    await initPdfDoc('REPASSE DE INDICAÇÃO');

  const COLS = [
    { key: 'patient',      label: 'Paciente',     w: 70 },
    { key: 'saleDate',     label: 'Data Venda',    w: 35, align: 'center' },
    { key: 'totalValue',   label: 'Valor Total',  w: 45, align: 'right' },
    { key: 'referralValue',label: 'Repasse 10%',  w: 45, align: 'right' },
  ];
  const totalW = COLS.reduce((s, c) => s + c.w, 0);
  const tableX = ML + (CW - totalW) / 2;

  const formatter = {
    specialty: (v) => (v || '-').replace(/_/g, ' '),
    totalValue: (v) => BRL(v),
    referralValue: (v) => BRL(v),
  };

  const drawTotals = (y, totals) => {
    doc.setFillColor(...P.totalBg);
    doc.rect(tableX, y, totalW, 8, 'F');
    doc.setFillColor(...P.purple);
    doc.rect(tableX, y, totalW, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...P.purple);
    const labelW = COLS.slice(0, 2).reduce((s, c) => s + c.w, 0);
    doc.text('TOTAL (' + totals.count + ' venda' + (totals.count !== 1 ? 's' : '') + ')', tableX + labelW / 2, y + 5.3, { align: 'center' });
    doc.setTextColor(...P.textMain);
    doc.text(BRL(totals.totalValue), tableX + labelW + COLS[2].w - 2, y + 5.3, { align: 'right' });
    doc.setTextColor(...[80, 140, 0]);
    doc.text(BRL(totals.referralValue), tableX + labelW + COLS[2].w + COLS[3].w - 2, y + 5.3, { align: 'right' });
    return y + 8;
  };

  drawHeader();
  drawFooter();
  let y = drawFilters(contentStartY, filters);
  y = drawTableHeader(doc, tableX, y, COLS, totalW);

  let zebra = false;
  const totals = { count: 0, totalValue: 0, referralValue: 0 };

  for (const row of rows) {
    totals.count++;
    totals.totalValue += row.totalValue || 0;
    totals.referralValue += row.referralValue || 0;

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