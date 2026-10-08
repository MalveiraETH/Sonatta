import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Wrench, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

export default function SubstitutionStatusCard({ product, concluding, onConcluirConserto }) {
  if (!product) return null;

  const stage = product.substitution_stage;
  const isReplacement = Boolean(product.replaced_product_id);

  if (!stage && !isReplacement) return null;

  const awaitingRepair = stage === 'aguardando_conserto';

  return (
    <div className="space-y-4">
      {/* Estado do conserto do aparelho substituído */}
      {stage && (
        <Card className={`border-0 shadow-sm ${awaitingRepair ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${awaitingRepair ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                {awaitingRepair
                  ? <Wrench className="h-5 w-5 text-amber-600" />
                  : <Package className="h-5 w-5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {awaitingRepair
                    ? 'Em substituição — aguardando retorno do conserto'
                    : 'Conserto concluído — aparelho devolvido ao estoque'}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Substituído pelo aparelho NS {product.substituted_by_serial || '-'}
                  {product.substitution_date ? ` · ${formatLocalDate(product.substitution_date)}` : ''}
                </p>
                {product.substitution_client_name && (
                  <p className="text-sm text-slate-600">Cliente atendido: {product.substitution_client_name}</p>
                )}
                {product.substitution_problem && (
                  <p className="text-sm text-slate-600">Defeito: {product.substitution_problem}</p>
                )}
                {product.substitution_notes && (
                  <p className="text-sm text-slate-600">Obs.: {product.substitution_notes}</p>
                )}
                {product.returned_to_stock_date && (
                  <p className="text-sm text-slate-600">
                    Retornou ao estoque em {formatLocalDate(product.returned_to_stock_date)}
                  </p>
                )}
              </div>
            </div>
            {awaitingRepair && (
              <Button
                onClick={onConcluirConserto}
                disabled={concluding}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {concluding
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Concluir Conserto e Devolver ao Estoque
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Aparelho substituto — informa qual aparelho com defeito ele substituiu */}
      {isReplacement && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <ArrowLeftRight className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Aparelho substituto (troca por defeito)</p>
                <p className="font-medium">
                  Substituiu o aparelho NS {product.replaced_serial || '-'}
                  {product.substitution_date && (
                    <span className="text-sm text-slate-500 font-normal ml-2">
                      · {formatLocalDate(product.substitution_date)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}