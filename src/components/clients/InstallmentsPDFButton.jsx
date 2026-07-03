import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const statusLabel = (status, dueDate) => {
  const isOverdue = new Date(dueDate) < new Date() && status !== 'pago';
  if (status === 'pago') return 'PAGO';
  if (isOverdue) return 'ATRASADO';
  if (status === 'parcialmente_pago') return 'PARCIAL';
  return 'PENDENTE';
};

export default function InstallmentsPDFButton({ installments, clientName, paymentMethod }) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const title = paymentMethod === 'pix_parcelado' ? 'Relatório de Parcelas PIX' : 'Relatório de Parcelas Cartão';
      const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Header
      doc.setFillColor(107, 63, 160);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SONATTA', 14, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Soluções Auditivas', 14, 20);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 105, 16, { align: 'center' });

      // Client info
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${clientName}`, 14, 36);
      doc.text(`Emitido em: ${now}`, 14, 43);

      // Summary
      const paid = installments.filter(i => i.payment_status === 'pago');
      const pending = installments.filter(i => i.payment_status !== 'pago');
      const totalPaid = paid.reduce((s, i) => s + (i.paid_amount || 0), 0);
      const totalPending = pending.reduce((s, i) => s + (i.remaining_amount || 0), 0);

      doc.setFillColor(245, 245, 250);
      doc.rect(14, 48, 182, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Total de parcelas: ${installments.length}`, 18, 56);
      doc.text(`Pagas: ${paid.length}  |  Total pago: ${formatCurrency(totalPaid)}`, 18, 63);
      doc.text(`Pendentes/Atrasadas: ${pending.length}  |  Saldo devedor: ${formatCurrency(totalPending)}`, 100, 63);

      // Table header
      let y = 80;
      doc.setFillColor(107, 63, 160);
      doc.rect(14, y - 6, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Venda', 16, y - 0.5);
      doc.text('Parcela', 48, y - 0.5);
      doc.text('Vencimento', 72, y - 0.5);
      doc.text('Original', 108, y - 0.5);
      doc.text('Pago', 132, y - 0.5);
      doc.text('Saldo', 156, y - 0.5);
      doc.text('Status', 181, y - 0.5);

      y += 6;
      doc.setFont('helvetica', 'normal');

      const sorted = [...installments].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      sorted.forEach((inst, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const st = statusLabel(inst.payment_status, inst.due_date);
        const isOverdue = st === 'ATRASADO';
        const isPaid = st === 'PAGO';

        doc.setTextColor(50, 50, 50);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 248, 255);
          doc.rect(14, y - 5, 182, 8, 'F');
        }

        doc.setFontSize(8);
        doc.text(inst.sale_number || '-', 16, y);
        doc.text(`${inst.installment_number}/${inst.installments_total || '?'}`, 48, y);
        doc.text(format(new Date(inst.due_date), 'dd/MM/yyyy', { locale: ptBR }), 72, y);
        doc.text(formatCurrency(inst.original_amount), 108, y);
        doc.text(formatCurrency(inst.paid_amount || 0), 132, y);
        doc.text(formatCurrency(inst.remaining_amount || 0), 156, y);

        // Status badge color
        if (isPaid) doc.setTextColor(22, 163, 74);
        else if (isOverdue) doc.setTextColor(220, 38, 38);
        else if (st === 'PARCIAL') doc.setTextColor(180, 120, 0);
        else doc.setTextColor(37, 99, 235);

        doc.setFont('helvetica', 'bold');
        doc.text(st, 181, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);

        y += 9;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Sonatta Soluções Auditivas - Relatório gerado automaticamente', 14, 290);
        doc.text(`Página ${i}/${pageCount}`, 196, 290, { align: 'right' });
      }

      const filename = `parcelas_${paymentMethod === 'pix_parcelado' ? 'pix' : 'cartao'}_${clientName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={generatePDF}
      disabled={generating || installments.length === 0}
      className="text-[#6B3FA0] border-[#6B3FA0] hover:bg-[#6B3FA0]/10"
    >
      <FileText className="h-4 w-4 mr-1" />
      {generating ? 'Gerando...' : 'Exportar PDF'}
    </Button>
  );
}