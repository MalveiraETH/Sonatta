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
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.width = '210mm';
      element.style.minHeight = '297mm';
      element.style.padding = '0';
      element.style.margin = '0';
      element.style.backgroundColor = 'white';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.fontSize = '11pt';
      element.style.lineHeight = '1.6';
      element.style.color = '#1a202c';
      
      const footer = footerInfo ? `
        <div style="border-top: 2px solid #6B3FA0; padding: 15px 0; margin-top: 25px; background: linear-gradient(to top, #ffffff 0%, #f8f9fa 100%);">
          <div style="text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 9pt; color: #4a5568; line-height: 1.6;">
              <strong style="color: #6B3FA0;">Sonatta - Soluções Auditivas</strong><br>
              Edifício Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007<br>
              Adrianópolis, Manaus – AM, 69057-035
            </p>
            <p style="margin: 8px 0 0 0; font-size: 8.5pt; color: #4a5568; line-height: 1.6;">
              📱 ${footerInfo.phone} | 🌐 ${footerInfo.website}<br>
              📸 ${footerInfo.instagram} | 📘 Facebook: @sonatta.manaus | 💼 LinkedIn: /sonatta
            </p>
          </div>
        </div>
      ` : '';
      
      element.innerHTML = `
        <div style="min-height: 297mm; display: flex; flex-direction: column; box-sizing: border-box;">
          <!-- Header -->
          <div style="text-align: center; padding: 8mm 20mm 6mm 20mm; border-bottom: 2px solid #6B3FA0;">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/a0b7b5040_Logo_Sonatta.png" 
                 style="max-width: 140px; height: auto;" />
          </div>
          
          <!-- Content -->
          <div style="flex: 1; padding: 20mm 25mm; white-space: pre-wrap; text-align: justify;">
            ${contractText.replace(/\n/g, '<br>')}
          </div>
          
          <!-- Footer -->
          <div style="padding: 0 25mm 15mm 25mm;">
            ${footer}
          </div>
        </div>
      `;
      
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(element);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const headerHeight = 20;
      const footerHeight = 25;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageNumber++;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        
        const headerImg = await html2canvas(document.createElement('div'), {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageNumber++;
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