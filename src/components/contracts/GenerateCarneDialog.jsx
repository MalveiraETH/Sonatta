import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildCarnePdf } from '@/lib/carnePdf';
import { ensureContractForSale, findContractBySale } from '@/lib/contractFromSale';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// Gera o carnê da venda e registra o contrato correspondente (número).
// O documento do contrato é gerado depois, na aba Documentos do cliente.
export default function GenerateCarneDialog({ open, onOpenChange, sale, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [existingContract, setExistingContract] = useState(null);
  const [installmentsCount, setInstallmentsCount] = useState(0);

  const pixPayment = sale?.payment_details?.find((p) => p.method === 'pix_parcelado');

  useEffect(() => {
    if (!open || !sale?.id) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [contract, installmentsRes] = await Promise.all([
          findContractBySale(sale.id),
          base44.entities.Installment.filter({ sale_id: sale.id }, { limit: 200 }),
        ]);
        if (!active) return;
        setExistingContract(contract);
        setInstallmentsCount(
          (installmentsRes.items || []).filter((i) => i.payment_method === 'pix_parcelado').length
        );
      } catch (e) {
        if (active) toast.error('Não foi possível carregar os dados do carnê');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, sale?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { contract, created } = await ensureContractForSale({ sale });
      const { doc, fileName, estimated } = await buildCarnePdf({ contract, sale });
      doc.save(fileName);

      toast.success(
        created
          ? `Carnê gerado e contrato nº ${contract.contract_number} registrado.`
          : `Carnê gerado para o contrato nº ${contract.contract_number}.`
      );
      if (estimated) {
        toast.warning('Parcelas estimadas: não há parcelas registradas em Contas a Receber para esta venda.');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Erro ao gerar o carnê');
    } finally {
      setGenerating(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">Gerar Carnê</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#6B3FA0]" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Card className="p-4 bg-slate-50 border-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Cliente:</span>
                  <p className="font-medium">{sale.client_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Venda:</span>
                  <p className="font-medium">{sale.sale_number}</p>
                </div>
                <div>
                  <span className="text-slate-500">Data:</span>
                  <p className="font-medium">{formatLocalDate(sale.sale_date || sale.created_date)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Valor total:</span>
                  <p className="font-medium">{formatCurrency(sale.total)}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Parcelas do PIX parcelado:{' '}
                <strong>{pixPayment?.installments ? `${pixPayment.installments}x` : '—'}</strong>
                {' · '}
                {installmentsCount > 0
                  ? `${installmentsCount} parcela(s) registrada(s) em Contas a Receber`
                  : 'sem parcelas registradas em Contas a Receber'}
              </p>
              <p>
                Contrato:{' '}
                {existingContract
                  ? `já registrado (nº ${existingContract.contract_number})`
                  : 'será registrado agora com um novo número'}
              </p>
              <p className="text-xs text-slate-500">
                O documento do contrato é gerado depois, na aba Documentos dos detalhes do cliente.
              </p>
            </div>

            {!pixPayment && (
              <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Esta venda não possui PIX Parcelado, portanto o carnê não pode ser gerado.</p>
              </div>
            )}

            {pixPayment && installmentsCount === 0 && (
              <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Não há parcelas registradas para esta venda: o carnê será gerado com datas e
                  valores estimados a partir da venda.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !pixPayment}
                className="bg-[#6B3FA0] hover:bg-[#834CB8]"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-2" />
                )}
                Gerar Carnê
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}