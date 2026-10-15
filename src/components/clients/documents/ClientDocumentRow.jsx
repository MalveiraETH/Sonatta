import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileText,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  downloadDocumentPdf,
  generateDocumentPdf,
  shareDocumentPdf,
} from '@/lib/documentPdf';

export default function ClientDocumentRow({ document, client, canDelete, onOpen, onDelete }) {
  const [busy, setBusy] = useState(null);

  const handleDownload = async () => {
    setBusy('pdf');
    try {
      const { doc, fileName } = await generateDocumentPdf(document.content, document.title);
      downloadDocumentPdf(doc, fileName);
      toast.success('PDF gerado e baixado');
    } catch (e) {
      toast.error('Não foi possível gerar o PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const { doc, fileName } = await generateDocumentPdf(document.content, document.title);
      const result = await shareDocumentPdf(doc, fileName, {
        title: document.title,
        phone: client?.phone,
      });
      if (result === 'fallback') {
        toast.info('PDF baixado — anexe o arquivo na conversa do WhatsApp');
      }
    } catch (e) {
      toast.error('Não foi possível preparar o documento');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
      <button type="button" onClick={onOpen} className="flex items-center gap-3 min-w-0 text-left">
        <div className="w-10 h-10 rounded-full bg-[#6B3FA0]/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-[#6B3FA0]" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{document.title}</p>
          <p className="text-sm text-slate-500 truncate">
            {document.template_name ? `${document.template_name} · ` : ''}
            {document.updated_date
              ? format(new Date(document.updated_date), 'dd/MM/yyyy', { locale: ptBR })
              : ''}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpen}
          className="text-[#6B3FA0] border-[#6B3FA0] hover:bg-[#6B3FA0]/10 hidden sm:inline-flex"
        >
          <Pencil className="h-4 w-4 mr-1" />
          Abrir
        </Button>

        {busy ? (
          <div className="w-9 h-9 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#6B3FA0]" />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="text-slate-500">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen} className="sm:hidden">
                <Pencil className="h-4 w-4 mr-2" />
                Abrir / editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar por WhatsApp
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}