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
        <div style="border-top: 2px solid #6B3FA0; padding-top: 12px; margin-top: 25px; background: linear-gradient(to top, #ffffff 0%, #f8f9fa 100%); padding-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 20px;">
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 8.5pt; color: #4a5568; line-height: 1.5;">
                <strong style="color: #6B3FA0; font-size: 9pt;">Sonatta - Soluções Auditivas</strong><br>
                Edifício Corporate Trade Center<br>
                Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007<br>
                Adrianópolis, Manaus – AM, 69057-035
              </p>
            </div>
            <div style="flex: 1; text-align: right;">
              <p style="margin: 0; font-size: 8.5pt; color: #4a5568; line-height: 1.8;">
                <strong style="color: #6B3FA0; font-size: 9pt;">Contato:</strong><br>
                📞 ${footerInfo.phone}<br>
                ✉️ ${footerInfo.email}<br>
                🌐 ${footerInfo.website}<br>
                📸 ${footerInfo.instagram}
              </p>
            </div>
          </div>
        </div>
      ` : '';
      
      element.innerHTML = `
        <div style="min-height: 297mm; display: flex; flex-direction: column; box-sizing: border-box;">
          <!-- Header -->
          <div style="text-align: center; padding: 15mm 20mm 12mm 20mm; border-bottom: 3px solid #6B3FA0; background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/a0b7b5040_Logo_Sonatta.png" 
                 style="max-width: 160px; height: auto; margin-bottom: 12px;" />
            <div style="margin-top: 8px;">
              <p style="margin: 0; font-size: 8.5pt; color: #6B3FA0; font-weight: 600; line-height: 1.4;">
                Edifício Corporate Trade Center, Rod. Álvaro Maia, 2357 – 10º Andar, Sala 1007<br>
                Adrianópolis, Manaus – AM, 69057-035 | CNPJ: 33.457.952/0001-98
              </p>
            </div>
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
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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