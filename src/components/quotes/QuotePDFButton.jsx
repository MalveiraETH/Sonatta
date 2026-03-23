import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { openWhatsApp } from '@/utils/whatsapp';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (date) => {
  const d = date ? new Date(date + 'T12:00:00') : new Date();
  return d.toLocaleDateString('pt-BR');
};

export default function QuotePDFButton({ quote, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    const contentW = W - margin * 2;

    // ── HEADER ──────────────────────────────────────────────────
    // Fundo azul escuro
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 38, 'F');

    // Faixa roxa fina
    doc.setFillColor(107, 63, 160);
    doc.rect(0, 38, W, 4, 'F');

    // Nome da empresa
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SONATTA', margin, 18);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 230);
    doc.text('Soluções Auditivas', margin, 25);

    // Info da empresa no header (direita)
    doc.setTextColor(200, 220, 245);
    doc.setFontSize(7.5);
    const rightX = W - margin;
    doc.text('CNPJ: 33.457.952/0001-98', rightX, 12, { align: 'right' });
    doc.text('Edif. Corporate Trade Center – Rod. Álvaro Maia, 2357', rightX, 17, { align: 'right' });
    doc.text('10º Andar, Sala 1007 – Adrianópolis, Manaus – AM', rightX, 22, { align: 'right' });
    doc.text('(92) 99169-2102  |  contato@sonatta.com.br', rightX, 27, { align: 'right' });
    doc.text('www.sonatta.com.br  |  @sonatta.manaus', rightX, 32, { align: 'right' });

    // ── TÍTULO ORÇAMENTO ─────────────────────────────────────────
    doc.setFillColor(247, 249, 252);
    doc.rect(0, 42, W, 18, 'F');

    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PROPOSTA COMERCIAL', margin, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`Nº ${quote.quote_number || '—'}`, margin, 57);

    // Data e validade à direita
    doc.setTextColor(80, 80, 100);
    doc.text(`Data: ${formatDate(quote.created_date)}`, rightX, 52, { align: 'right' });
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + (quote.validity_days || 30));
    doc.text(`Válida até: ${validDate.toLocaleDateString('pt-BR')}`, rightX, 57, { align: 'right' });

    // ── DADOS DO CLIENTE ─────────────────────────────────────────
    let y = 68;
    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('DADOS DO CLIENTE', margin + 3, y + 5);

    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);

    const clientFields = [
      ['Nome', quote.client_name || '—'],
      ['CPF', quote.client_cpf || '—'],
      ['Telefone', quote.client_phone || '—'],
      ['E-mail', quote.client_email || '—'],
    ];

    clientFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 120);
      doc.text(`${label}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 50);
      doc.text(value, margin + 28, y);
      y += 5.5;
    });

    // ── TABELA DE ITENS ──────────────────────────────────────────
    y += 4;
    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('ITENS DO ORÇAMENTO', margin + 3, y + 5);
    y += 9;

    // Cabeçalho da tabela
    doc.setFillColor(240, 243, 248);
    doc.rect(margin, y, contentW, 6, 'F');
    doc.setTextColor(50, 50, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const cols = { item: margin + 3, qty: margin + 105, unitPrice: margin + 132, total: margin + 163 };
    doc.text('Descrição', cols.item, y + 4);
    doc.text('Qtd', cols.qty, y + 4);
    doc.text('Valor Unit.', cols.unitPrice, y + 4);
    doc.text('Total', cols.total, y + 4);
    y += 8;

    // Linhas dos itens
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let alternate = false;
    (quote.items || []).forEach((item) => {
      if (alternate) {
        doc.setFillColor(248, 250, 254);
        doc.rect(margin, y - 1, contentW, 7, 'F');
      }
      doc.setTextColor(30, 30, 50);
      // Truncar nome se muito longo
      const name = doc.splitTextToSize(item.product_name || '—', 95)[0];
      doc.text(name, cols.item, y + 4);
      doc.text(String(item.quantity || 1), cols.qty, y + 4);
      doc.text(formatCurrency(item.unit_price), cols.unitPrice, y + 4);
      doc.text(formatCurrency(item.total), cols.total, y + 4);
      y += 7;
      alternate = !alternate;
    });

    // Linha divisória
    doc.setDrawColor(200, 210, 230);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    // ── TOTAIS ───────────────────────────────────────────────────
    const totalsX = W - margin - 75;
    const totalsW = 75;

    const renderTotalRow = (label, value, highlight = false) => {
      if (highlight) {
        doc.setFillColor(107, 63, 160);
        doc.rect(totalsX, y - 1, totalsW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
      } else {
        doc.setTextColor(80, 80, 100);
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
      renderTotalRow(`Desconto (${pct}%):`, `- ${formatCurrency(quote.discount)}`);
    }
    renderTotalRow('TOTAL:', formatCurrency(quote.total), true);

    // ── CONDIÇÕES COMERCIAIS ─────────────────────────────────────
    y += 8;
    doc.setFillColor(30, 58, 95);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.text('CONDIÇÕES COMERCIAIS', margin + 3, y + 5);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);

    const installment18 = quote.subtotal > 0 ? quote.subtotal / 18 : quote.total / 18;
    const conditions = [
      `• Parcelamento em até 18x no cartão de crédito (18x de ${formatCurrency(installment18)})`,
      `• Desconto especial para pagamento à vista (Dinheiro ou PIX): ${formatCurrency(quote.total)}`,
      `• PIX Parcelado: condições a combinar`,
      `• Garantia: 2 a 4 anos conforme fabricante`,
      `• Validade desta proposta: ${quote.validity_days || 30} dias`,
    ];

    conditions.forEach((line) => {
      doc.text(line, margin + 3, y);
      y += 6;
    });

    // Observações
    if (quote.notes) {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 100);
      doc.text('Observações:', margin + 3, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 80);
      const obsLines = doc.splitTextToSize(quote.notes, contentW - 6);
      doc.text(obsLines, margin + 3, y);
      y += obsLines.length * 5 + 3;
    }

    // ── RODAPÉ ───────────────────────────────────────────────────
    const footerY = 280;
    doc.setFillColor(107, 63, 160);
    doc.rect(0, footerY - 2, W, 1.5, 'F');
    doc.setFillColor(30, 58, 95);
    doc.rect(0, footerY, W, 17, 'F');

    doc.setTextColor(200, 220, 245);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Sonatta Soluções Auditivas  |  CNPJ: 33.457.952/0001-98', W / 2, footerY + 5, { align: 'center' });
    doc.text('(92) 99169-2102  |  contato@sonatta.com.br  |  www.sonatta.com.br  |  @sonatta.manaus', W / 2, footerY + 10, { align: 'center' });
    doc.setTextColor(150, 180, 220);
    doc.text('Obrigado pela confiança!', W / 2, footerY + 14.5, { align: 'center' });

    return doc;
  };

  const handleGenerateAndSend = async () => {
    if (!quote.client_phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    setLoading(true);
    try {
      const doc = generatePDF();
      const filename = `Orcamento_${quote.quote_number || 'Sonatta'}.pdf`;
      doc.save(filename);

      // Pequeno delay para o download iniciar
      await new Promise((res) => setTimeout(res, 600));

      const phone = quote.client_phone.replace(/\D/g, '');
      const message =
        `Olá ${quote.client_name}! 😊\n\n` +
        `Segue em anexo a proposta comercial *Nº ${quote.quote_number}* da Sonatta Soluções Auditivas.\n\n` +
        `📋 *Resumo:*\n` +
        (quote.items || []).map((i) => `• ${i.product_name}`).join('\n') +
        `\n\n💰 *Total:* ${formatCurrency(quote.total)}\n` +
        `📅 *Validade:* ${quote.validity_days || 30} dias\n\n` +
        `Qualquer dúvida estamos à disposição! 🎧\n\n_Equipe Sonatta_`;

      openWhatsApp(`55${phone}`, message);

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
      className="border-[#6B3FA0] text-[#6B3FA0] hover:bg-[#6B3FA0] hover:text-white"
      onClick={handleGenerateAndSend}
      disabled={loading}
      title="Gerar PDF e enviar pelo WhatsApp"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}