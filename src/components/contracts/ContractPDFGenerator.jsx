import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ContractPDFGenerator({ contract, contractText }) {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Criar elemento temporário para renderizar o contrato
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.width = '210mm'; // A4 width
      element.style.padding = '20mm';
      element.style.backgroundColor = 'white';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.fontSize = '11pt';
      element.style.lineHeight = '1.6';
      
      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694e93aa7609bf14847de917/a0b7b5040_Logo_Sonatta.png" 
               style="max-width: 200px; height: auto;" />
        </div>
        <div style="white-space: pre-wrap; text-align: justify;">
          ${contractText.replace(/\n/g, '<br>')}
        </div>
      `;
      
      document.body.appendChild(element);

      // Aguardar carregamento da imagem
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar elemento como canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remover elemento temporário
      document.body.removeChild(element);

      // Criar PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adicionar páginas se necessário
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