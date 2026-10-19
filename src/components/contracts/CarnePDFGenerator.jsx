import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildCarnePdf } from '@/lib/carnePdf';

export default function CarnePDFGenerator({ contract, sale }) {
  const [generating, setGenerating] = React.useState(false);

  const generateCarne = async () => {
    setGenerating(true);
    try {
      const { doc, fileName, estimated } = await buildCarnePdf({ contract, sale });
      doc.save(fileName);
      if (estimated) {
        toast.warning('Carnê gerado com parcelas estimadas: não há parcelas registradas em Contas a Receber para esta venda.');
      } else {
        toast.success('Carnê gerado com sucesso!');
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Erro ao gerar carnê');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateCarne}
      disabled={generating}
      variant="outline"
      className="border-[#6B3FA0] text-[#6B3FA0] hover:bg-[#6B3FA0] hover:text-white w-full sm:w-auto"
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