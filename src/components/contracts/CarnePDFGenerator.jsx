import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados da empresa são carregados dinamicamente do AppSettings

// Cor roxa Sonatta em RGB
const PURPLE = [107, 63, 160];
const LIGHT_PURPLE = [230, 220, 245];

export default function CarnePDFGenerator({ contract, sale }) {
  const [generating, setGenerating] = React.useState(false);

  // Busca as parcelas da venda e gera o carnê
  const generateCarne = async () => {
    if (!contract || !sale) return;

    const pixPayment = sale.payment_details?.find(p => p.method === 'pix_parcelado');
    if (!pixPayment) {
      toast.error('Esta venda não possui PIX Parcelado');
      return;
    }

    setGenerating(true);
    try {
      // Buscar dados da empresa cadastrada
      const companies = await base44.entities.Company.list();
      const company = companies[0] || {};
      const SONATTA = {
        name: company.name || 'Sonatta – Soluções Auditivas',
        cnpj: company.cnpj || '33.457.952/0001-98',
        address: company.address || '',
        phone: company.phone || '(92) 99169-2102',
        email: company.email || 'contato@sonatta.com.br',
        website: company.website || 'www.sonatta.com.br',
      };

      // Buscar parcelas já geradas para essa venda
      let installments = await base44.entities.Installment.filter({ sale_id: sale.id });
      installments = installments.filter(i => i.payment_method === 'pix_parcelado');
      installments.sort((a, b) => a.installment_number - b.installment_number);

      // Se não houver parcelas registradas, gera ficticiamente a partir dos dados da venda
      if (installments.length === 0) {
        const totalInstallments = pixPayment.installments || 1;
        const grossAmount = pixPayment.amount / totalInstallments;
        const saleDate = new Date(sale.sale_date || sale.created_date);
        installments = Array.from({ length: totalInstallments }, (_, i) => ({
          installment_number: i + 1,
          installments_total: totalInstallments,
          gross_amount: grossAmount,
          net_amount: grossAmount,
          due_date: format(addMonths(saleDate, i + 1), 'yyyy-MM-dd'),
          payment_status: 'pendente',
          paid_amount: 0,
        }));
      }

      await buildPDF(contract, sale, pixPayment, installments, SONATTA);
      toast.success('Carnê gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar carnê');
    } finally {
      setGenerating(false);
    }
  };

  const buildPDF = async (contract, sale, pixPayment, installments, SONATTA) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210;
    const margin = 14;
    const usable = PW - margin * 2;

    const formatCurrency = (v) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const formatDate = (d) => {
      if (!d) return '—';
      const date = new Date(d + 'T12:00:00');
      return format(date, 'dd/MM/yyyy');
    };

    const setColor = ([r, g, b]) => { pdf.setFillColor(r, g, b); pdf.setTextColor(r, g, b); };
    const setDraw = ([r, g, b]) => pdf.setDrawColor(r, g, b);

    // ── CAPA ──────────────────────────────────────────────────────────────
    // Header roxo
    pdf.setFillColor(...PURPLE);
    pdf.rect(0, 0, PW, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CARNÊ DE PAGAMENTO', PW / 2, 17, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('PIX PARCELADO', PW / 2, 24, { align: 'center' });
    pdf.text(SONATTA.name.toUpperCase(), PW / 2, 30, { align: 'center' });
    pdf.text(`CNPJ: ${SONATTA.cnpj}`, PW / 2, 36, { align: 'center' });

    let y = 50;

    // Bloco dados Sonatta + Cliente lado a lado
    const colW = (usable - 6) / 2;
    const col1x = margin;
    const col2x = margin + colW + 6;

    // Caixa Sonatta
    pdf.setFillColor(...LIGHT_PURPLE);
    pdf.setDrawColor(...PURPLE);
    pdf.roundedRect(col1x, y, colW, 42, 2, 2, 'FD');

    pdf.setTextColor(...PURPLE);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DADOS DA EMPRESA', col1x + 3, y + 6);

    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const sonattaLines = [
      SONATTA.name,
      `CNPJ: ${SONATTA.cnpj}`,
      SONATTA.address,
      `Tel: ${SONATTA.phone}`,
      SONATTA.email,
    ];
    sonattaLines.forEach((line, i) => {
      const wrapped = pdf.splitTextToSize(line, colW - 6);
      pdf.text(wrapped, col1x + 3, y + 13 + i * 5.5);
    });

    // Caixa Cliente
    pdf.setFillColor(...LIGHT_PURPLE);
    pdf.setDrawColor(...PURPLE);
    pdf.roundedRect(col2x, y, colW, 42, 2, 2, 'FD');

    pdf.setTextColor(...PURPLE);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DADOS DO CLIENTE', col2x + 3, y + 6);

    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'normal');
    const clientLines = [
      contract.client_name || '—',
      `CPF: ${contract.client_cpf || '—'}`,
      `Tel: ${contract.client_phone || '—'}`,
      `Email: ${contract.client_email || '—'}`,
      contract.client_address || '—',
    ];
    clientLines.forEach((line, i) => {
      const wrapped = pdf.splitTextToSize(line, colW - 6);
      pdf.text(wrapped, col2x + 3, y + 13 + i * 5.5);
    });

    y += 50;

    // Resumo da venda
    pdf.setFillColor(245, 245, 250);
    pdf.setDrawColor(200, 200, 220);
    pdf.roundedRect(margin, y, usable, 24, 2, 2, 'FD');

    pdf.setTextColor(...PURPLE);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('RESUMO DA VENDA', margin + 3, y + 6);

    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'normal');
    const resumeItems = [
      [`Contrato:`, contract.contract_number],
      [`Venda Nº:`, sale.sale_number],
      [`Total da Venda:`, formatCurrency(sale.total)],
      [`Total PIX Parcelado:`, formatCurrency(pixPayment.amount)],
      [`Nº de Parcelas:`, `${pixPayment.installments}x`],
      [`Valor da Parcela:`, formatCurrency(pixPayment.amount / pixPayment.installments)],
    ];

    const itemW = usable / 3;
    resumeItems.forEach(([label, val], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = margin + 3 + col * itemW;
      const iy = y + 13 + row * 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, x, iy);
      pdf.setFont('helvetica', 'normal');
      pdf.text(val, x + pdf.getTextWidth(label) + 2, iy);
    });

    // Produtos
    y += 32;
    pdf.setFillColor(...PURPLE);
    pdf.rect(margin, y, usable, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('PRODUTOS', margin + 3, y + 4.5);

    y += 7;
    sale.items?.forEach((item, idx) => {
      pdf.setFillColor(idx % 2 === 0 ? 252 : 245, idx % 2 === 0 ? 252 : 245, idx % 2 === 0 ? 255 : 250);
      pdf.rect(margin, y, usable, 8, 'F');
      pdf.setTextColor(30, 30, 30);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const desc = `${item.product_name}${item.brand ? ` — ${item.brand}` : ''}${item.model ? ` ${item.model}` : ''}`;
      pdf.text(desc, margin + 3, y + 5);
      if (item.serial_number) pdf.text(`Série: ${item.serial_number}`, margin + 3, y + 9.5);
      pdf.text(formatCurrency(item.total), PW - margin - 3, y + 5, { align: 'right' });
      y += item.serial_number ? 11 : 8;
    });

    y += 6;
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'italic');
    pdf.text('As parcelas detalhadas estão nas páginas seguintes. Guarde este documento para controle dos pagamentos.', PW / 2, y, { align: 'center' });

    // ── PARCELAS — 4 coupons por página ──────────────────────────────────
    // A4 = 297mm. Reservamos 4 slots de 68mm + 3 separadores de 3mm = 4*68+3*3 = 281mm (topo em y=8, bottom em 289)
    const SLOTS = 4;
    const SLOT_H = 68; // altura total de cada slot (inclui separador)
    const SEP_H = 3;   // altura da linha de corte entre slots
    const COUPON_H = SLOT_H - SEP_H; // 65mm de coupon visível
    const PAGE_START_Y = 8; // margem superior das páginas de parcelas
    const totalInstallments = installments.length;

    const statusColors = {
      pago: [34, 197, 94],
      pendente: [234, 179, 8],
      atrasado: [239, 68, 68],
      parcialmente_pago: [59, 130, 246],
    };
    const statusLabels = {
      pago: 'PAGO',
      pendente: 'PENDENTE',
      atrasado: 'ATRASADO',
      parcialmente_pago: 'PARCIAL',
    };

    installments.forEach((inst, idx) => {
      const slotIndex = idx % SLOTS;

      // Nova página a cada 4 coupons
      if (slotIndex === 0) pdf.addPage();

      // Y absoluto onde este slot começa
      const slotTopY = PAGE_START_Y + slotIndex * SLOT_H;

      // Linha de corte ANTES do slot (exceto o primeiro)
      if (slotIndex > 0) {
        const cutY = slotTopY - SEP_H / 2;
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(margin, cutY, PW - margin, cutY);
        pdf.setLineDashPattern([], 0);
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(6);
        pdf.text('✂  recorte aqui', PW / 2, cutY - 0.5, { align: 'center' });
      }

      // Y onde começa o conteúdo do coupon (deixa 1mm de padding após separador)
      const cy = slotIndex === 0 ? slotTopY : slotTopY - SEP_H + 1.5;
      const cx = margin;
      const cw = usable;

      // ── Header ──
      pdf.setFillColor(...PURPLE);
      pdf.roundedRect(cx, cy, cw, 10, 1.5, 1.5, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(`Parcela ${inst.installment_number}/${totalInstallments}`, cx + 4, cy + 6.5);

      // Status badge
      const sc = statusColors[inst.payment_status] || [150, 150, 150];
      const sl = statusLabels[inst.payment_status] || inst.payment_status?.toUpperCase();
      pdf.setFillColor(...sc);
      pdf.roundedRect(cx + cw - 30, cy + 1.5, 26, 7, 1.5, 1.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(sl, cx + cw - 17, cy + 6.3, { align: 'center' });

      // Constantes de layout do coupon — todos os gaps são GAP mm
      const GAP = 0.7;   // ≈ 2px equivalente em mm
      const FIELD_H = 11; // altura de cada bloco de campo
      const fW = cw / 3;

      // ── Empresa (linha fina abaixo do header) ──
      const compY = cy + 11;
      pdf.setTextColor(120, 120, 120);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text(`${SONATTA.name}  •  CNPJ: ${SONATTA.cnpj}`, cx, compY);

      // ── Grade de campos 3x2 ──
      // Linha 1: CLIENTE | CPF | CONTRATO
      // Linha 2: VENDA   | VENCIMENTO | VALOR DA PARCELA
      const fields = [
        { label: 'CLIENTE', value: pdf.splitTextToSize(contract.client_name || '—', fW - 8)[0] },
        { label: 'CPF', value: contract.client_cpf || '—' },
        { label: 'CONTRATO', value: contract.contract_number || '—' },
        { label: 'VENDA', value: sale.sale_number || '—' },
        { label: 'VENCIMENTO', value: formatDate(inst.due_date) },
        { label: 'VALOR DA PARCELA', value: formatCurrency(inst.gross_amount) },
      ];

      const GRID_TOP = compY + 2;

      fields.forEach((f, fi) => {
        const fc = fi % 3;
        const fr = Math.floor(fi / 3);
        const fx = cx + fc * fW;
        const fy = GRID_TOP + fr * (FIELD_H + GAP);

        pdf.setFillColor(245, 243, 252);
        pdf.setDrawColor(...PURPLE);
        pdf.roundedRect(fx + GAP / 2, fy, fW - GAP, FIELD_H, 1, 1, 'FD');

        pdf.setTextColor(...PURPLE);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.5);
        pdf.text(f.label, fx + 2.5, fy + 3.5);

        pdf.setTextColor(20, 20, 20);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(String(f.value), fx + 2.5, fy + 9);
      });

      // ── Área de pagamento (valor pago + data) ──
      const fillY = GRID_TOP + 2 * (FIELD_H + GAP) + GAP;
      const fillH = 10;
      const halfW = cw / 2 - GAP / 2;

      // Valor pago
      pdf.setFillColor(252, 252, 252);
      pdf.setDrawColor(...PURPLE);
      pdf.roundedRect(cx, fillY, halfW, fillH, 1, 1, 'FD');
      pdf.setTextColor(...PURPLE);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.5);
      pdf.text('VALOR PAGO (R$)', cx + 2.5, fillY + 3.5);
      if (inst.paid_amount > 0) {
        pdf.setTextColor(34, 197, 94);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text(formatCurrency(inst.paid_amount), cx + 2.5, fillY + 8.2);
      } else {
        pdf.setTextColor(210, 210, 210);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text('___________________', cx + 2.5, fillY + 8.2);
      }

      // Data do pagamento
      pdf.setFillColor(252, 252, 252);
      pdf.setDrawColor(...PURPLE);
      pdf.roundedRect(cx + halfW + GAP, fillY, halfW, fillH, 1, 1, 'FD');
      pdf.setTextColor(...PURPLE);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.5);
      pdf.text('DATA DO PAGAMENTO', cx + halfW + GAP + 2.5, fillY + 3.5);
      if (inst.last_payment_date) {
        pdf.setTextColor(34, 197, 94);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text(formatDate(inst.last_payment_date), cx + halfW + GAP + 2.5, fillY + 8.2);
      } else {
        pdf.setTextColor(210, 210, 210);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text('____/____/________', cx + halfW + GAP + 2.5, fillY + 8.2);
      }

      // ── Instrução PIX ──
      const PIX_H = 9;
      const instrY = fillY + fillH + GAP;

      pdf.setFillColor(240, 235, 252);
      pdf.setDrawColor(...PURPLE);
      pdf.roundedRect(cx, instrY, cw, PIX_H, 1, 1, 'FD');

      pdf.setTextColor(...PURPLE);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.5);
      pdf.text('CHAVE PIX (CNPJ):', cx + 2.5, instrY + 3);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(30, 30, 30);
      pdf.text(SONATTA.cnpj, cx + 2.5, instrY + 7.5);

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(5.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Guarde o comprovante e apresente junto a este carnê.', cx + cw - 2.5, instrY + 5.5, { align: 'right' });
    });

    pdf.save(`carne_${contract.contract_number}.pdf`);
  };

  return (
    <Button
      onClick={generateCarne}
      disabled={generating}
      variant="outline"
      className="border-[#6B3FA0] text-[#6B3FA0] hover:bg-[#6B3FA0] hover:text-white"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <BookOpen className="h-4 w-4 mr-2" />
      )}
      Gerar Carnê
    </Button>
  );
}