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
    const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/6be15c70b_IMG_5204.png';

    // Borda roxa superior fina
    pdf.setFillColor(...PURPLE);
    pdf.rect(0, 0, PW, 3, 'F');

    // Header: logo + textos lado a lado, fundo branco limpo
    const HDR_Y = 8;
    const HDR_H = 36;

    // Fundo header com borda suave
    pdf.setFillColor(250, 248, 255);
    pdf.setDrawColor(...LIGHT_PURPLE);
    pdf.roundedRect(margin, HDR_Y, usable, HDR_H, 2, 2, 'FD');

    // Logo à esquerda
    try {
      pdf.addImage(LOGO_URL, 'PNG', margin + 4, HDR_Y + 4, 28, 28);
    } catch (_) { /* sem logo */ }

    // Textos à direita do logo, centralizados verticalmente
    const txtX = margin + 38;
    const txtW = usable - 42;

    pdf.setTextColor(...PURPLE);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('CARNÊ DE PAGAMENTO', txtX + txtW / 2, HDR_Y + 11, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 60, 120);
    pdf.text('PIX PARCELADO', txtX + txtW / 2, HDR_Y + 18, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(50, 50, 50);
    pdf.text(SONATTA.name.toUpperCase(), txtX + txtW / 2, HDR_Y + 25, { align: 'center' });

    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`CNPJ: ${SONATTA.cnpj}`, txtX + txtW / 2, HDR_Y + 31, { align: 'center' });

    // Linha divisória roxa fina abaixo do header
    let y = HDR_Y + HDR_H + 4;
    pdf.setDrawColor(...PURPLE);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, PW - margin, y);
    y += 5;

    // ── Bloco dados Sonatta + Cliente lado a lado ──
    const colW = (usable - 4) / 2;
    const col1x = margin;
    const col2x = margin + colW + 4;

    // Calcula altura necessária para caixa empresa (endereço pode ser longo)
    const addrWrapped = pdf.splitTextToSize(SONATTA.address || '', colW - 8);
    const boxH = Math.max(42, 14 + (addrWrapped.length + 3) * 5);

    // Caixa Empresa
    pdf.setFillColor(250, 248, 255);
    pdf.setDrawColor(...LIGHT_PURPLE);
    pdf.roundedRect(col1x, y, colW, boxH, 2, 2, 'FD');

    pdf.setFillColor(...PURPLE);
    pdf.roundedRect(col1x, y, colW, 7, 2, 2, 'F');
    pdf.rect(col1x, y + 4, colW, 3, 'F'); // corta cantos inferiores arredondados do header
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('DADOS DA EMPRESA', col1x + 3, y + 5);

    let ey = y + 12;
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(SONATTA.name, col1x + 3, ey); ey += 5.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`CNPJ: ${SONATTA.cnpj}`, col1x + 3, ey); ey += 5;
    if (SONATTA.address) {
      const wrapped = pdf.splitTextToSize(SONATTA.address, colW - 8);
      pdf.text(wrapped, col1x + 3, ey); ey += wrapped.length * 4.5;
    }
    if (SONATTA.phone) { pdf.text(`Tel: ${SONATTA.phone}`, col1x + 3, ey); ey += 5; }
    if (SONATTA.email) {
      const emailWrapped = pdf.splitTextToSize(SONATTA.email, colW - 8);
      pdf.text(emailWrapped, col1x + 3, ey);
    }

    // Caixa Cliente
    pdf.setFillColor(250, 248, 255);
    pdf.setDrawColor(...LIGHT_PURPLE);
    pdf.roundedRect(col2x, y, colW, boxH, 2, 2, 'FD');

    pdf.setFillColor(...PURPLE);
    pdf.roundedRect(col2x, y, colW, 7, 2, 2, 'F');
    pdf.rect(col2x, y + 4, colW, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('DADOS DO CLIENTE', col2x + 3, y + 5);

    let cy2 = y + 12;
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    const clientNameW = pdf.splitTextToSize(contract.client_name || '—', colW - 8);
    pdf.text(clientNameW, col2x + 3, cy2); cy2 += clientNameW.length * 5.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`CPF: ${contract.client_cpf || '—'}`, col2x + 3, cy2); cy2 += 5;
    pdf.text(`Tel: ${contract.client_phone || '—'}`, col2x + 3, cy2); cy2 += 5;
    pdf.text(`Email: ${contract.client_email || '—'}`, col2x + 3, cy2); cy2 += 5;
    if (contract.client_address) {
      const addrW = pdf.splitTextToSize(contract.client_address, colW - 8);
      pdf.text(addrW, col2x + 3, cy2);
    }

    y += boxH + 5;

    // ── Resumo da venda ──
    pdf.setFillColor(250, 248, 255);
    pdf.setDrawColor(...LIGHT_PURPLE);
    pdf.roundedRect(margin, y, usable, 30, 2, 2, 'FD');

    pdf.setFillColor(...PURPLE);
    pdf.roundedRect(margin, y, usable, 7, 2, 2, 'F');
    pdf.rect(margin, y + 4, usable, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('RESUMO DA VENDA', margin + 3, y + 5);

    const resumeItems = [
      ['Contrato', contract.contract_number],
      ['Venda Nº', sale.sale_number],
      ['Total da Venda', formatCurrency(sale.total)],
      ['Total PIX Parcelado', formatCurrency(pixPayment.amount)],
      ['Nº de Parcelas', `${pixPayment.installments}x`],
      ['Valor da Parcela', formatCurrency(pixPayment.amount / pixPayment.installments)],
    ];

    const itemW = usable / 3;
    resumeItems.forEach(([label, val], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const rx = margin + 3 + col * itemW;
      const ry = y + 13 + row * 8;
      pdf.setTextColor(100, 80, 140);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.text(label.toUpperCase(), rx, ry);
      pdf.setTextColor(20, 20, 20);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(String(val), rx, ry + 5);
    });

    y += 38;

    // ── Produtos ──
    pdf.setFillColor(250, 248, 255);
    pdf.setDrawColor(...LIGHT_PURPLE);
    const prodItems = sale.items || [];
    const prodH = 10 + prodItems.reduce((acc, item) => acc + (item.serial_number ? 10 : 7), 0);
    pdf.roundedRect(margin, y, usable, prodH, 2, 2, 'FD');

    pdf.setFillColor(...PURPLE);
    pdf.roundedRect(margin, y, usable, 7, 2, 2, 'F');
    pdf.rect(margin, y + 4, usable, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('PRODUTOS', margin + 3, y + 5);

    let py = y + 12;
    prodItems.forEach((item, idx) => {
      if (idx > 0) {
        pdf.setDrawColor(220, 210, 240);
        pdf.setLineWidth(0.2);
        pdf.line(margin + 2, py - 2, PW - margin - 2, py - 2);
      }
      pdf.setTextColor(30, 30, 30);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const desc = item.product_name || '';
      pdf.text(desc, margin + 3, py);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(item.total), PW - margin - 3, py, { align: 'right' });
      if (item.serial_number) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Série: ${item.serial_number}`, margin + 3, py + 4.5);
        py += 10;
      } else {
        py += 7;
      }
    });

    y = py + 8;
    pdf.setTextColor(120, 100, 160);
    pdf.setFontSize(7);
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
      // GAP acima (após header de 10mm) + texto de 6.5pt ≈ 2.3mm altura + GAP abaixo antes da grade
      const COMP_LINE_H = 2.3; // altura aprox do texto 6.5pt
      const compY = cy + 10 + GAP + COMP_LINE_H; // baseline do texto
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

      const GRID_TOP = compY + GAP;

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