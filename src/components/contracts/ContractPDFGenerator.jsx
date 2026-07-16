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
      blocks.push({ type: 'paragraph', segments: line.segments, align: line.align, lineHeight: line.lineHeight, marginBottom: line.marginBottom });
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

  // Ler line-height e margin-bottom do estilo inline (gerado pelo Quill)
  const lineHeightRaw = node.style?.lineHeight || '';
  const lineHeight = parseFloat(lineHeightRaw) || null;
  const marginBottomRaw = node.style?.marginBottom || '';
  const marginBottom = parseFloat(marginBottomRaw) || null; // em px

  const walk = (n, ctx = { bold: false, italic: false }) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = n.textContent;
      if (text) segments.push({ text, bold: ctx.bold, italic: ctx.italic, size: null });
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const t = n.tagName.toLowerCase();
    if (t === 'br') {
      segments.push({ text: '\n', bold: false, italic: false, size: null });
      return;
    }
    // Herda estilo do contexto e detecta bold/italic via tag ou class do Quill
    const isBold = ctx.bold || t === 'strong' || t === 'b'
      || n.classList?.contains('ql-bold')
      || n.style?.fontWeight === 'bold' || n.style?.fontWeight >= 700;
    const isItalic = ctx.italic || t === 'em' || t === 'i'
      || n.classList?.contains('ql-italic')
      || n.style?.fontStyle === 'italic';
    Array.from(n.childNodes).forEach(child => walk(child, { bold: isBold, italic: isItalic }));
  };

  Array.from(node.childNodes).forEach(n => walk(n));
  return { segments, align, lineHeight, marginBottom };
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
      const LINE_HEIGHT_NORMAL = 5.5;   // mm por linha (fonte 11pt)
      const LINE_HEIGHT_HEADING = 7;
      const PARA_SPACING = 2.5;         // espaço depois de parágrafo normal
      const FONT_SIZE_NORMAL = 10;
      const FONT_SIZE_H1 = 13;
      const FONT_SIZE_H2 = 11;
      const FONT_SIZE_H3 = 10;

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

      // Quebra texto respeitando palavras (sem cortar no meio da palavra)
      const splitWords = (text, maxW) => {
        // usa splitTextToSize do jsPDF que já respeita palavras
        return pdf.splitTextToSize(text, maxW);
      };

      // Inicia primeira página
      initPage();

      for (const block of blocks) {
        if (block.type === 'linebreak') {
          curY += LINE_HEIGHT_NORMAL * 0.4;
          continue;
        }

        if (block.type === 'heading') {
          const fs = block.level === 1 ? FONT_SIZE_H1 : block.level === 2 ? FONT_SIZE_H2 : FONT_SIZE_H3;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(fs);
          pdf.setTextColor(30, 30, 30);
          const lines = splitWords(block.text, contentW);
          checkPageBreak(lines.length * LINE_HEIGHT_HEADING + PARA_SPACING);
          pdf.text(lines, marginL, curY);
          curY += lines.length * LINE_HEIGHT_HEADING + PARA_SPACING;
          continue;
        }

        if (block.type === 'listitem') {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(FONT_SIZE_NORMAL);
          pdf.setTextColor(30, 30, 30);
          const prefix = block.ordered ? `${block.index}.` : '\u2022';
          const indent = 4;
          const lines = splitWords(`${prefix} ${block.text}`, contentW - indent);
          checkPageBreak(lines.length * LINE_HEIGHT_NORMAL + 1.5);
          pdf.text(lines, marginL + indent, curY);
          curY += lines.length * LINE_HEIGHT_NORMAL + 1.5;
          continue;
        }

        if (block.type === 'paragraph') {
          const { segments, align, lineHeight: blockLH, marginBottom: blockMB } = block;

          // Parágrafo sem conteúdo real = espaço reduzido entre seções
          const fullText = segments?.map(s => s.text).join('') || '';
          if (!fullText.trim()) {
            curY += LINE_HEIGHT_NORMAL * 0.5;
            continue;
          }

          const hasBold = segments.some(s => s.bold);
          const hasItalic = segments.some(s => s.italic);
          const fontStyle = hasBold && hasItalic ? 'bolditalic' : hasBold ? 'bold' : hasItalic ? 'italic' : 'normal';

          pdf.setFont('helvetica', fontStyle);
          pdf.setFontSize(FONT_SIZE_NORMAL);
          pdf.setTextColor(30, 30, 30);

          const jsPDFAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
          const textX = align === 'center' ? pageW / 2 : align === 'right' ? pageW - marginR : marginL;

          // line-height do editor (ex: 1.5) → mm; marginBottom px → mm (1px ≈ 0.264mm)
          const effectiveLH = blockLH ? LINE_HEIGHT_NORMAL * blockLH : LINE_HEIGHT_NORMAL;
          const effectiveMB = blockMB ? Math.min(blockMB * 0.264, 8) : PARA_SPACING;

          const lines = splitWords(fullText, contentW);
          checkPageBreak(lines.length * effectiveLH + effectiveMB);
          pdf.text(lines, textX, curY, { align: jsPDFAlign });
          curY += lines.length * effectiveLH + effectiveMB;
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