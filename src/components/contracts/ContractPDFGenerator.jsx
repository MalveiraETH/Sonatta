import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
// html2canvas removido: PDF agora usa renderização nativa de texto (vetorial, selecionável)

// Converte HTML do Quill em lista de blocos de texto estruturados
function parseHtmlToBlocks(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const blocks = [];

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) blocks.push({ type: 'text', text, bold: false, italic: false });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    if (tag === 'p' || tag === 'div') {
      const line = extractInlineText(node);
      blocks.push({ type: 'paragraph', segments: line.segments, align: line.align });
      return;
    }
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = node.textContent.trim();
      blocks.push({ type: 'heading', text, level: parseInt(tag[1]) });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li'));
      items.forEach((li, idx) => {
        const text = li.textContent.trim();
        blocks.push({ type: 'listitem', text, ordered: tag === 'ol', index: idx + 1 });
      });
      return;
    }
    if (tag === 'br') {
      blocks.push({ type: 'linebreak' });
      return;
    }
    // fallback: iterate children
    Array.from(node.childNodes).forEach(processNode);
  };

  Array.from(div.childNodes).forEach(processNode);
  return blocks;
}

function extractInlineText(node) {
  const segments = [];
  let alignClass = node.getAttribute('class') || '';
  let align = 'left';
  if (alignClass.includes('ql-align-center') || node.style?.textAlign === 'center') align = 'center';
  else if (alignClass.includes('ql-align-right') || node.style?.textAlign === 'right') align = 'right';
  else if (alignClass.includes('ql-align-justify') || node.style?.textAlign === 'justify') align = 'justify';

  const walk = (n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = n.textContent;
      if (text) segments.push({ text, bold: false, italic: false, size: null });
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const t = n.tagName.toLowerCase();
    if (t === 'strong' || t === 'b') {
      const inner = n.textContent;
      if (inner) segments.push({ text: inner, bold: true, italic: false, size: null });
      return;
    }
    if (t === 'em' || t === 'i') {
      const inner = n.textContent;
      if (inner) segments.push({ text: inner, bold: false, italic: true, size: null });
      return;
    }
    if (t === 'br') {
      segments.push({ text: '\n', bold: false, italic: false, size: null });
      return;
    }
    Array.from(n.childNodes).forEach(walk);
  };

  Array.from(node.childNodes).forEach(walk);
  return { segments, align };
}

// Carrega imagem como base64 via canvas (com CORS)
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

export default function ContractPDFGenerator({ contract, contractText }) {
  const [generating, setGenerating] = React.useState(false);
  const [contractTemplate, setContractTemplate] = React.useState(null);

  React.useEffect(() => {
    base44.entities.ContractTemplate.filter({ name: 'PIX Parcelado' })
      .then(list => { if (list[0]) setContractTemplate(list[0]); })
      .catch(() => {});
  }, []);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const headerInfo = contractTemplate?.header_info || {};
      const footerInfo = contractTemplate?.footer_info || {};

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const marginL = 20;
      const marginR = 20;
      const marginTop = 28;
      const marginBottom = 22;
      const contentW = pageW - marginL - marginR;
      const headerH = 22;
      const footerY = pageH - marginBottom;

      // Carregar logo
      let logoData = null;
      if (headerInfo.logo_url) {
        logoData = await loadImageAsBase64(headerInfo.logo_url);
      }

      const drawHeader = () => {
        pdf.setDrawColor(107, 63, 160);
        pdf.setLineWidth(0.5);

        if (logoData) {
          const maxLogoH = 14;
          const maxLogoW = 60;
          const ratio = logoData.w / logoData.h;
          let lh = maxLogoH;
          let lw = lh * ratio;
          if (lw > maxLogoW) { lw = maxLogoW; lh = lw / ratio; }
          const logoX = marginL;
          const logoY = (headerH - lh) / 2;
          pdf.addImage(logoData.dataUrl, 'PNG', logoX, logoY, lw, lh);
        } else {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(107, 63, 160);
          pdf.text('SONATTA', marginL, 14);
        }

        pdf.line(marginL, headerH, pageW - marginR, headerH);
      };

      const drawFooter = () => {
        const fi = footerInfo;
        const parts = [
          fi.phone, fi.email, fi.website, fi.instagram
        ].filter(Boolean).join('   |   ');

        pdf.setDrawColor(107, 63, 160);
        pdf.setLineWidth(0.3);
        pdf.line(marginL, footerY - 4, pageW - marginR, footerY - 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(parts, pageW / 2, footerY, { align: 'center' });
      };

      // Parse do HTML do contrato
      const blocks = parseHtmlToBlocks(contractText);

      // Configurações de layout de texto
      const LINE_HEIGHT_NORMAL = 6.5;
      const LINE_HEIGHT_HEADING = 8;
      const PARA_SPACING = 3;
      const FONT_SIZE_NORMAL = 11;
      const FONT_SIZE_H1 = 14;
      const FONT_SIZE_H2 = 12;
      const FONT_SIZE_H3 = 11;

      let curY = marginTop + headerH;
      let currentPage = 1;

      const initPage = () => {
        drawHeader();
        drawFooter();
        curY = marginTop + headerH;
      };

      const checkPageBreak = (neededH) => {
        if (curY + neededH > footerY - 6) {
          pdf.addPage();
          currentPage++;
          initPage();
        }
      };

      // Inicia primeira página
      initPage();

      for (const block of blocks) {
        if (block.type === 'linebreak') {
          curY += LINE_HEIGHT_NORMAL * 0.5;
          continue;
        }

        if (block.type === 'heading') {
          const fs = block.level === 1 ? FONT_SIZE_H1 : block.level === 2 ? FONT_SIZE_H2 : FONT_SIZE_H3;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(fs);
          pdf.setTextColor(30, 30, 30);
          const lines = pdf.splitTextToSize(block.text, contentW);
          checkPageBreak(lines.length * LINE_HEIGHT_HEADING + PARA_SPACING);
          pdf.text(lines, marginL, curY);
          curY += lines.length * LINE_HEIGHT_HEADING + PARA_SPACING;
          continue;
        }

        if (block.type === 'listitem') {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(FONT_SIZE_NORMAL);
          pdf.setTextColor(30, 30, 30);
          const prefix = block.ordered ? `${block.index}.` : '•';
          const text = `${prefix} ${block.text}`;
          const lines = pdf.splitTextToSize(text, contentW - 4);
          checkPageBreak(lines.length * LINE_HEIGHT_NORMAL + 1);
          pdf.text(lines, marginL + 2, curY);
          curY += lines.length * LINE_HEIGHT_NORMAL + 1;
          continue;
        }

        if (block.type === 'paragraph') {
          const { segments, align } = block;
          if (!segments || segments.length === 0) {
            // parágrafo vazio = espaçamento entre parágrafos
            curY += LINE_HEIGHT_NORMAL;
            continue;
          }

          // Verificar se o parágrafo inteiro é só texto (sem mixed bold/italic)
          // Para simplicidade e confiabilidade, concatenamos e renderizamos com estilo do primeiro segmento
          const fullText = segments.map(s => s.text).join('');
          if (!fullText.trim() && fullText !== '\n') {
            curY += LINE_HEIGHT_NORMAL * 0.6;
            continue;
          }

          // Detectar se tem bold no parágrafo
          const hasBold = segments.some(s => s.bold);
          const hasItalic = segments.some(s => s.italic);
          const fontStyle = hasBold && hasItalic ? 'bolditalic' : hasBold ? 'bold' : hasItalic ? 'italic' : 'normal';

          pdf.setFont('helvetica', fontStyle);
          pdf.setFontSize(FONT_SIZE_NORMAL);
          pdf.setTextColor(30, 30, 30);

          const jsPDFAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
          const textX = align === 'center' ? pageW / 2 : align === 'right' ? pageW - marginR : marginL;

          const lines = pdf.splitTextToSize(fullText, contentW);
          checkPageBreak(lines.length * LINE_HEIGHT_NORMAL + PARA_SPACING);
          pdf.text(lines, textX, curY, { align: jsPDFAlign });
          curY += lines.length * LINE_HEIGHT_NORMAL + PARA_SPACING;
          continue;
        }
      }

      pdf.save(`contrato_${contract.contract_number || 'documento'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
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