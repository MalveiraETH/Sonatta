import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ContractPDFGenerator({ contract, contractText }) {
  const [generating, setGenerating] = React.useState(false);
  const [footerInfo, setFooterInfo] = React.useState(null);

  React.useEffect(() => {
    loadFooterInfo();
  }, []);

  const loadFooterInfo = async () => {
    try {
      const templates = await base44.entities.ContractTemplate.filter({ name: 'PIX Parcelado' });
      if (templates.length > 0 && templates[0].footer_info) {
        setFooterInfo(templates[0].footer_info);
      }
    } catch (error) {
      console.error(error);
    }
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
      const margin = 25;
      const headerHeight = 18;
      const footerHeight = 23;
      const contentAreaHeight = pageHeight - headerHeight - footerHeight;

      // Criar cabeçalho
      const createHeader = () => {
        const headerElement = document.createElement('div');
        headerElement.style.width = '210mm';
        headerElement.style.position = 'absolute';
        headerElement.style.left = '-9999px';
        headerElement.innerHTML = `
          <div style="text-align: center; padding: 8mm 0 5mm 0; border-bottom: 2px solid #6B3FA0; background: white;">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/a0b7b5040_Logo_Sonatta.png" 
                 style="max-width: 130px; height: auto;" />
          </div>
        `;
        return headerElement;
      };

      // Criar rodapé
      const createFooter = () => {
        const footerElement = document.createElement('div');
        footerElement.style.width = '210mm';
        footerElement.style.position = 'absolute';
        footerElement.style.left = '-9999px';
        
        const footerContent = footerInfo ? `
          <div style="border-top: 2px solid #6B3FA0; padding: 10px 25mm; background: white; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 9pt; color: #4a5568; line-height: 1.5;">
                <strong style="color: #6B3FA0;">Sonatta - Soluções Auditivas</strong><br>
                Edifício Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007<br>
                Adrianópolis, Manaus – AM, 69057-035
              </p>
              <p style="margin: 6px 0 0 0; font-size: 8pt; color: #4a5568; line-height: 1.5;">
                <span style="display: inline-flex; align-items: center; margin: 0 8px;">📱 ${footerInfo.phone}</span>
                <span style="display: inline-flex; align-items: center; margin: 0 8px;">🌐 ${footerInfo.website}</span><br>
                <span style="display: inline-flex; align-items: center; margin: 0 6px;">📸 ${footerInfo.instagram}</span>
                <span style="display: inline-flex; align-items: center; margin: 0 6px;">📘 @sonatta.manaus</span>
                <span style="display: inline-flex; align-items: center; margin: 0 6px;">💼 /sonatta</span>
              </p>
            </div>
          </div>
        ` : '';
        
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

      // Renderizar cabeçalho e rodapé
      const headerElement = createHeader();
      const footerElement = createFooter();
      
      document.body.appendChild(headerElement);
      document.body.appendChild(footerElement);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const headerCanvas = await html2canvas(headerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const footerCanvas = await html2canvas(footerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(headerElement);
      document.body.removeChild(footerElement);

      const headerImgData = headerCanvas.toDataURL('image/png');
      const footerImgData = footerCanvas.toDataURL('image/png');

      // Adicionar páginas ao PDF
      for (let i = 0; i < numberOfPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Adicionar cabeçalho
        pdf.addImage(headerImgData, 'PNG', 0, 0, pageWidth, headerHeight);

        // Adicionar conteúdo
        const sourceY = i * contentAreaHeight * (contentCanvas.width / contentImgWidth);
        const sourceHeight = Math.min(contentAreaHeight * (contentCanvas.width / contentImgWidth), contentCanvas.height - sourceY);
        
        if (sourceHeight > 0) {
          pdf.addImage(
            contentImgData,
            'PNG',
            margin,
            headerHeight,
            contentImgWidth,
            (sourceHeight * contentImgWidth) / contentCanvas.width,
            undefined,
            'FAST',
            0,
            -sourceY
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