import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const BG_URL = 'https://media.base44.com/images/public/694e93aa7609bf14847de917/fc6253047_TABELADEVALORESSONATTA-4.png';

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
    const H = 297;
    const margin = 18;
    const contentW = W - margin * 2;

    const purple = [98, 42, 126];
    const green  = [136, 188, 7];
    const textDark = [40, 35, 50];
    const textMid  = [80, 60, 100];

    // Background image (full page)
    const bgData = await loadImageAsBase64(BG_URL);
    if (bgData) {
      doc.addImage(bgData, 'PNG', 0, 0, W, H);
    }

    // Content starts below the header (logo + green circle area ~ 58mm)
    // Content ends before the purple footer wave ~ 195mm
    let y = 58;

    // ── TÍTULO ───────────────────────────────────────────────────
    doc.setTextColor(...purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PROPOSTA COMERCIAL', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMid);
    doc.text('Nº ' + (quote.quote_number || '—'), margin, y + 5.5);

    const rightX = W - margin;
    doc.text('Data: ' + formatDate(quote.created_date), rightX, y, { align: 'right' });
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + (quote.validity_days || 30));
    doc.text('Válida até: ' + validDate.toLocaleDateString('pt-BR'), rightX, y + 5.5, { align: 'right' });

    // Linha separadora
    y += 10;
    doc.setDrawColor(...green);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    // ── DADOS DO CLIENTE ─────────────────────────────────────────
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.text('DADOS DO CLIENTE', margin + 2, y + 4.2);
    y += 8;

    doc.setFontSize(8.5);
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
      doc.text(value, margin + 25, y);
      y += 5;
    });

    y += 3;

    // ── TABELA DE ITENS ──────────────────────────────────────────
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.text('ITENS DO ORÇAMENTO', margin + 2, y + 4.2);
    y += 8;

    // Cabeçalho da tabela
    doc.setFillColor(235, 225, 245);
    doc.rect(margin, y, contentW, 5.5, 'F');
    doc.setTextColor(...purple);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    const cols = { item: margin + 2, qty: margin + 105, unitPrice: margin + 130, total: margin + 158 };
    doc.text('Descrição', cols.item, y + 3.8);
    doc.text('Qtd', cols.qty, y + 3.8);
    doc.text('Valor Unit.', cols.unitPrice, y + 3.8);
    doc.text('Total', cols.total, y + 3.8);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let alternate = false;
    (quote.items || []).forEach((item) => {
      if (alternate) {
        doc.setFillColor(248, 244, 252);
        doc.rect(margin, y - 1, contentW, 6.5, 'F');
      }
      doc.setTextColor(...textDark);
      const name = doc.splitTextToSize(item.product_name || '—', 95)[0];
      doc.text(name, cols.item, y + 3.5);
      doc.text(String(item.quantity || 1), cols.qty, y + 3.5);
      doc.text(formatCurrency(item.unit_price), cols.unitPrice, y + 3.5);
      doc.text(formatCurrency(item.total), cols.total, y + 3.5);
      y += 6.5;
      alternate = !alternate;
    });

    doc.setDrawColor(...green);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 4;

    // ── TOTAIS ───────────────────────────────────────────────────
    const totalsX = W - margin - 72;
    const totalsW = 72;

    const renderTotalRow = (label, value, highlight = false) => {
      if (highlight) {
        doc.setFillColor(...purple);
        doc.rect(totalsX, y - 1, totalsW, 7.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
      } else {
        doc.setTextColor(...textMid);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }
      doc.text(label, totalsX + 3, y + 4.5);
      doc.text(value, totalsX + totalsW - 2, y + 4.5, { align: 'right' });
      y += highlight ? 9 : 6.5;
    };

    renderTotalRow('Subtotal:', formatCurrency(quote.subtotal));
    if (quote.discount > 0) {
      const pct = quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) : 0;
      renderTotalRow('Desconto (' + pct + '%):', '- ' + formatCurrency(quote.discount));
    }
    renderTotalRow('TOTAL:', formatCurrency(quote.total), true);

    y += 5;

    // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────
    doc.setFillColor(...purple);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.text('CONDIÇÕES COMERCIAIS', margin + 2, y + 4.2);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
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
      doc.text(line, margin + 2, y);
      y += 5.5;
    });

    if (quote.notes) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMid);
      doc.text('Observações:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      const obsLines = doc.splitTextToSize(quote.notes, contentW - 4);
      doc.text(obsLines, margin + 2, y);
    }

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