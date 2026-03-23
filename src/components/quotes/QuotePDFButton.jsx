import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const LOGO_URL = 'https://media.base44.com/images/public/694e93aa7609bf14847de917/17777c948_SONATTA_CARDS-10.png';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (date) => {
  const d = date ? new Date(date + 'T12:00:00') : new Date();
  return d.toLocaleDateString('pt-BR');
};

const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    const contentW = W - margin * 2;

    const purple = [98, 42, 126];
    const green  = [136, 188, 7];
    const textDark = [32, 31, 28];
    const textMid  = [66, 63, 51];

    // HEADER
    doc.setFillColor(...purple);
    doc.rect(0, 0, W, 38, 'F');

    doc.setFillColor(...green);
    doc.rect(0, 38, W, 3, 'F');

    const logoData = await loadImageAsBase64(LOGO_URL);
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 4, 52, 30);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('SONATTA', margin, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Soluções Auditivas', margin, 27);
    }

    doc.setTextColor(230, 220, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const rightX = W - margin;
    doc.text('CNPJ: 33.457.952/0001-98', rightX, 10, { align: 'right' });
    doc.text('Edif. Corporate Trade Center', rightX, 15, { align: 'right' });
    doc.text('Rod. Álvaro Maia, 2357 - 10º Andar, Sala 1007', rightX, 20, { align: 'right' });
    doc.text('Adrianópolis, Manaus - AM, 69057-035', rightX, 25, { align: 'right' });
    doc.text('(92) 98464-5343  |  contato@sonatta.store', rightX, 30, { align: 'right' });
    doc.text('www.sonatta.store  |  @sonatta.store', rightX, 35, { align: 'right' });

    // TÍTULO
    doc.setFillColor(247, 244, 250);
    doc.rect(0, 41, W, 18, 'F');

    doc.setTextColor(...purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PROPOSTA COMERCIAL', margin, 51);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textMid);
    doc.text('Nº ' + (quote.quote_number || '—'), margin, 56);

    doc.setTextColor(...textMid);
    doc.text('Data: ' + formatDate(quote.created_date), rightX, 51, { align: 'right' });
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + (quote.validity_days || 30));
    doc.text('Válida até: ' + validDate.toLocaleDateString('pt-BR'), rightX, 56, { align: 'right' });

    // DADOS DO CLIENTE
    let y = 67;
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('DADOS DO CLIENTE', margin + 3, y + 5);

    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textDark);

    const clientFields = [
      ['Nome', quote.client_name || '—'],
      ['CPF', quote.client_cpf || '—'],
      ['Telefone', quote.client_phone || '—'],
      ['E-mail', quote.client_email || '—'],
    ];

    clientFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMid);
      doc.text(label + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(value, margin + 28, y);
      y += 5.5;
    });

    // TABELA DE ITENS
    y += 4;
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('ITENS DO ORÇAMENTO', margin + 3, y + 5);
    y += 9;

    doc.setFillColor(240, 235, 245);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setTextColor(...purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const cols = { item: margin + 3, qty: margin + 105, unitPrice: margin + 132, total: margin + 163 };
    doc.text('Descrição', cols.item, y + 4);
    doc.text('Qtd', cols.qty, y + 4);
    doc.text('Valor Unit.', cols.unitPrice, y + 4);
    doc.text('Total', cols.total, y + 4);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let alternate = false;
    (quote.items || []).forEach((item) => {
      if (alternate) {
        doc.setFillColor(250, 247, 253);
        doc.rect(margin, y - 1, contentW, 7, 'F');
      }
      doc.setTextColor(...textDark);
      const name = doc.splitTextToSize(item.product_name || '—', 95)[0];
      doc.text(name, cols.item, y + 4);
      doc.text(String(item.quantity || 1), cols.qty, y + 4);
      doc.text(formatCurrency(item.unit_price), cols.unitPrice, y + 4);
      doc.text(formatCurrency(item.total), cols.total, y + 4);
      y += 7;
      alternate = !alternate;
    });

    doc.setDrawColor(...green);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    // TOTAIS
    const totalsX = W - margin - 75;
    const totalsW = 75;

    const renderTotalRow = (label, value, highlight = false) => {
      if (highlight) {
        doc.setFillColor(...purple);
        doc.rect(totalsX, y - 1, totalsW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
      } else {
        doc.setTextColor(...textMid);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      doc.text(label, totalsX + 3, y + 5);
      doc.text(value, totalsX + totalsW - 3, y + 5, { align: 'right' });
      y += highlight ? 10 : 7;
    };

    renderTotalRow('Subtotal:', formatCurrency(quote.subtotal));
    if (quote.discount > 0) {
      const pct = quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) : 0;
      renderTotalRow('Desconto (' + pct + '%):', '- ' + formatCurrency(quote.discount));
    }
    renderTotalRow('TOTAL:', formatCurrency(quote.total), true);

    // CONDIÇÕES COMERCIAIS
    y += 8;
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('CONDIÇÕES COMERCIAIS', margin + 3, y + 5);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textDark);

    const installment18 = quote.subtotal > 0 ? quote.subtotal / 18 : quote.total / 18;
    const conditions = [
      '• Parcelamento em até 18x no cartão de crédito (18x de ' + formatCurrency(installment18) + ')',
      '• Desconto especial para pagamento à vista (Dinheiro ou PIX): ' + formatCurrency(quote.total),
      '• PIX Parcelado: condições a combinar',
      '• Garantia: 2 a 4 anos conforme fabricante',
      '• Validade desta proposta: ' + (quote.validity_days || 30) + ' dias',
    ];

    conditions.forEach((line) => {
      doc.text(line, margin + 3, y);
      y += 6;
    });

    if (quote.notes) {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMid);
      doc.text('Observações:', margin + 3, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      const obsLines = doc.splitTextToSize(quote.notes, contentW - 6);
      doc.text(obsLines, margin + 3, y);
      y += obsLines.length * 5 + 3;
    }

    // RODAPÉ
    const footerY = 278;
    doc.setFillColor(...green);
    doc.rect(0, footerY - 2, W, 2, 'F');
    doc.setFillColor(...purple);
    doc.rect(0, footerY, W, 19, 'F');

    doc.setTextColor(230, 220, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Sonatta Soluções Auditivas  |  CNPJ: 33.457.952/0001-98', W / 2, footerY + 5, { align: 'center' });
    doc.text('(92) 98464-5343  |  contato@sonatta.store  |  www.sonatta.store', W / 2, footerY + 10, { align: 'center' });
    doc.text('@sonatta.store (Instagram & Facebook)', W / 2, footerY + 15, { align: 'center' });

    return doc;
  };

  const handleGenerateAndSend = async () => {
    if (!quote.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    setLoading(true);
    try {
      const doc = await generatePDF();
      const filename = 'Orcamento_' + (quote.quote_number || 'Sonatta') + '.pdf';
      doc.save(filename);

      await new Promise((res) => setTimeout(res, 600));

      const phone = quote.client_phone.replace(/\D/g, '');
      const message =
        'Olá ' + quote.client_name + '! 😊\n\n' +
        'Segue em anexo a proposta comercial *Nº ' + quote.quote_number + '* da Sonatta Soluções Auditivas.\n\n' +
        '📋 *Resumo:*\n' +
        (quote.items || []).map((i) => '• ' + i.product_name).join('\n') +
        '\n\n💰 *Total:* ' + formatCurrency(quote.total) + '\n' +
        '📅 *Validade:* ' + (quote.validity_days || 30) + ' dias\n\n' +
        'Qualquer dúvida estamos à disposição! 🎧\n\n_Equipe Sonatta_';

      openWhatsApp('55' + phone, message);

      if (onStatusChange) await onStatusChange(quote, 'enviado');
      toast.success('PDF gerado e WhatsApp aberto!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-[#622A7E] text-[#622A7E] hover:bg-[#622A7E] hover:text-white"
      onClick={handleGenerateAndSend}
      disabled={loading}
      title="Gerar PDF e enviar pelo WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}