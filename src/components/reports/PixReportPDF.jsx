import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PixReportPDF({ clientsReport }) {
  const [generating, setGenerating] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      let yPosition = margin;

      // Função para adicionar nova página se necessário
      const checkNewPage = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Cabeçalho
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório PIX Parcelado', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPosition);
      yPosition += 10;

      // Estatísticas Gerais
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumo Geral', margin, yPosition);
      yPosition += 7;

      const totalClients = clientsReport.length;
      const adimplentes = clientsReport.filter(c => c.status === 'adimplente').length;
      const inadimplentes = clientsReport.filter(c => c.status === 'inadimplente').length;
      const totalDue = clientsReport.reduce((sum, c) => sum + c.totalDue, 0);
      const totalPaid = clientsReport.reduce((sum, c) => sum + c.totalPaid, 0);
      const totalRemaining = clientsReport.reduce((sum, c) => sum + c.totalRemaining, 0);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total de Clientes: ${totalClients}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Adimplentes: ${adimplentes}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Inadimplentes: ${inadimplentes}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Total Devido: ${formatCurrency(totalDue)}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Total Pago: ${formatCurrency(totalPaid)}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Saldo Restante: ${formatCurrency(totalRemaining)}`, margin + 5, yPosition);
      yPosition += 12;

      // Lista de Clientes
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalhamento por Cliente', margin, yPosition);
      yPosition += 10;

      clientsReport.forEach((clientData, index) => {
        checkNewPage(50);

        // Box do Cliente
        if (clientData.status === 'inadimplente') {
          pdf.setFillColor(254, 226, 226);
        } else {
          pdf.setFillColor(236, 253, 245);
        }
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 40, 'F');

        // Nome do Cliente
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(clientData.client.full_name, margin + 3, yPosition);
        yPosition += 6;

        // Dados do Cliente
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`CPF: ${clientData.client.cpf || 'N/A'}`, margin + 3, yPosition);
        pdf.text(`Tel: ${clientData.client.phone || 'N/A'}`, margin + 60, yPosition);
        yPosition += 5;

        // Status
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(clientData.status === 'inadimplente' ? 185, 28, 28 : 5, 150, 105);
        pdf.text(`Status: ${clientData.status.toUpperCase()}`, margin + 3, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 7;

        // Dados Financeiros
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total Devido: ${formatCurrency(clientData.totalDue)}`, margin + 3, yPosition);
        pdf.text(`Pago: ${formatCurrency(clientData.totalPaid)}`, margin + 60, yPosition);
        yPosition += 5;
        pdf.text(`Restante: ${formatCurrency(clientData.totalRemaining)}`, margin + 3, yPosition);
        pdf.text(`Parcelas: ${clientData.paidCount}/${clientData.installments.length}`, margin + 60, yPosition);
        yPosition += 5;

        if (clientData.overdueCount > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(185, 28, 28);
          pdf.text(`${clientData.overdueCount} parcela(s) em atraso`, margin + 3, yPosition);
          pdf.setTextColor(0, 0, 0);
        }

        yPosition += 10;
      });

      // Rodapé
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Sonatta - Soluções Auditivas | Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      pdf.save(`relatorio_pix_parcelado_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating || clientsReport.length === 0}
      className="bg-[#6B3FA0] hover:bg-[#834CB8]"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Gerar PDF
    </Button>
  );
}