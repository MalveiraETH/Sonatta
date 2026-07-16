import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ContractPDFGenerator({ contract, contractText }) {
  const [generating, setGenerating] = React.useState(false);
  const [contractTemplate, setContractTemplate] = React.useState(null);

  React.useEffect(() => {
    base44.entities.ContractTemplate.filter({ name: 'PIX Parcelado' })
      .then(list => { if (list[0]) setContractTemplate(list[0]); })
      .catch(() => {});
  }, []);

  const loadB64 = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

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
      const margin = 25;
      const headerHeight = 22;
      const footerHeight = 23;
      const contentAreaHeight = pageHeight - headerHeight - footerHeight;

      // Carregar logo via canvas
      const headerInfo = contractTemplate?.header_info || {};
      const footerInfo = contractTemplate?.footer_info || {};
      const LOGO_URL = headerInfo.logo_url || 'https://media.base44.com/images/public/694e93aa7609bf14847de917/79a5e2f8f_logomarca_sonatta.jpg';
      const logoB64 = await loadB64(LOGO_URL);

      // Desenhar cabeçalho diretamente no jsPDF (sem html2canvas)
      const drawHeader = () => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        if (logoB64) {
          const tmpImg = new Image();
          tmpImg.src = logoB64;
          const LOGO_MAX_H = 14, LOGO_MAX_W = 50;
          const ratio = tmpImg.naturalWidth / tmpImg.naturalHeight;
          let lw = LOGO_MAX_H * ratio, lh = LOGO_MAX_H;
          if (lw > LOGO_MAX_W) { lw = LOGO_MAX_W; lh = lw / ratio; }
          pdf.addImage(logoB64, 'JPEG', margin, (headerHeight - lh) / 2, lw, lh, undefined, 'NONE');
        } else {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(107, 63, 160);
          pdf.text('SONATTA', margin, 14);
        }
        pdf.setDrawColor(107, 63, 160);
        pdf.setLineWidth(0.5);
        pdf.line(margin, headerHeight - 1, pageWidth - margin, headerHeight - 1);
      };

      // Criar rodapé
      const createFooter = () => {
        const footerElement = document.createElement('div');
        footerElement.style.width = '210mm';
        footerElement.style.position = 'absolute';
        footerElement.style.left = '-9999px';
        
        const fi = footerInfo;
        const parts = [
          fi.phone ? `📱 ${fi.phone}` : '',
          fi.email ? `✉️ ${fi.email}` : '',
          fi.website ? `🌐 ${fi.website}` : '',
          fi.instagram ? `📸 ${fi.instagram}` : '',
        ].filter(Boolean).join('  &nbsp;|&nbsp;  ');
        const footerContent = `
          <div style="border-top: 2px solid #6B3FA0; padding: 10px 25mm; background: white; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 8pt; color: #4a5568; line-height: 1.5;">
                ${parts}
              </p>
            </div>
          </div>
        `;
        
        footerElement.innerHTML = footerContent;
        return footerElement;
      };

      // Criar conteúdo
      const contentElement = document.createElement('div');
      contentElement.style.position = 'absolute';
      contentElement.style.left = '-9999px';
      contentElement.style.width = '160mm';
      contentElement.style.fontFamily = 'Arial, sans-serif';
      contentElement.style.fontSize = '11pt';
      contentElement.style.lineHeight = '1.6';
      contentElement.style.color = '#1a202c';
      contentElement.style.textAlign = 'justify';
      contentElement.innerHTML = contractText.replace(/\n/g, '<br>');

      document.body.appendChild(contentElement);
      await new Promise(resolve => setTimeout(resolve, 500));

      const contentCanvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(contentElement);

      const contentImgData = contentCanvas.toDataURL('image/png');
      const contentImgWidth = 160;
      const contentImgHeight = (contentCanvas.height * contentImgWidth) / contentCanvas.width;

      // Calcular número de páginas necessárias
      const numberOfPages = Math.ceil(contentImgHeight / contentAreaHeight);

      // Renderizar apenas o rodapé com html2canvas
      const footerElement = createFooter();
      document.body.appendChild(footerElement);
      await new Promise(resolve => setTimeout(resolve, 300));

      const footerCanvas = await html2canvas(footerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(footerElement);
      const footerImgData = footerCanvas.toDataURL('image/png');

      // Adicionar páginas ao PDF
      for (let i = 0; i < numberOfPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Desenhar cabeçalho via jsPDF (logo nativa, sem html2canvas)
        drawHeader();

        // Adicionar conteúdo - cortar a imagem corretamente para cada página
        const scale = contentCanvas.width / contentImgWidth;
        const sourceY = i * contentAreaHeight * scale;
        const sourceHeight = Math.min(contentAreaHeight * scale, contentCanvas.height - sourceY);
        
        if (sourceHeight > 0) {
          const destHeight = sourceHeight / scale;
          
          // Criar um canvas temporário com apenas a parte necessária
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = contentCanvas.width;
          tempCanvas.height = sourceHeight;
          const ctx = tempCanvas.getContext('2d');
          
          // Copiar apenas a parte necessária do canvas original
          ctx.drawImage(
            contentCanvas,
            0, sourceY,                    // sx, sy - origem no canvas original
            contentCanvas.width, sourceHeight, // sWidth, sHeight - tamanho na origem
            0, 0,                          // dx, dy - destino no canvas temporário
            contentCanvas.width, sourceHeight  // dWidth, dHeight - tamanho no destino
          );
          
          // Adicionar a imagem recortada ao PDF
          const tempImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(
            tempImgData,
            'PNG',
            margin,
            headerHeight,
            contentImgWidth,
            destHeight
          );
        }

        // Adicionar rodapé
        pdf.addImage(footerImgData, 'PNG', 0, pageHeight - footerHeight, pageWidth, footerHeight);
      }

      pdf.save(`contrato_${contract.contract_number}.pdf`);
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