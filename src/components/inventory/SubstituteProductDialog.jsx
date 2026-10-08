import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, ArrowLeftRight, Check, Loader2, Package, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function SubstituteProductDialog({ open, onOpenChange, product, onSubstituted }) {
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [problem, setProblem] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearchTerm('');
      setProblem('');
      setNotes('');
      loadAvailable();
    }
  }, [open]);

  const loadAvailable = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Product.filter(
        { stock_type: 'serializado', status: 'disponivel' },
        '-created_date',
        500
      );
      setAvailable(data.filter(p => !p.is_trial && p.id !== product?.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const term = searchTerm.toLowerCase().trim();
  const filtered = (term
    ? available.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.serial_number || '').toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term) ||
        (p.model || '').toLowerCase().includes(term)
      )
    : available
  ).slice(0, 50);

  const handleConfirm = async () => {
    if (!selected) {
      toast.error('Selecione o aparelho substituto');
      return;
    }
    if (!problem.trim()) {
      toast.error('Descreva o defeito do aparelho');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('substituirAparelho', {
        defective_product_id: product.id,
        replacement_product_id: selected.id,
        problem: problem.trim(),
        notes: notes.trim(),
      });
      const data = res?.data ?? res;
      toast.success(`Substituição registrada — NS ${selected.serial_number || '-'} vinculado a ${data?.client_name || 'cliente'}`);
      onSubstituted?.(data);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Erro ao registrar a substituição');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-[#6B3FA0]" />
            Substituir Aparelho
          </DialogTitle>
          <DialogDescription>
            Troca de um aparelho com defeito por outro disponível. A venda original não é alterada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aparelho com defeito */}
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-700 uppercase">Aparelho com defeito</p>
                <p className="text-sm font-medium text-slate-800 truncate">{product?.name}</p>
                <p className="text-xs text-slate-600">
                  NS: {product?.serial_number || '-'} · Cliente: {product?.client_name || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Defeito */}
          <div>
            <Label htmlFor="sub-problem">Defeito relatado *</Label>
            <Textarea
              id="sub-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ex: aparelho não liga / chiado constante"
              rows={2}
            />
          </div>

          {/* Substituto */}
          <div className="space-y-2">
            <Label>Aparelho substituto (serializados disponíveis) *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por produto, NS, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-slate-50/50">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Nenhum aparelho disponível encontrado</p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                      selected?.id === p.id
                        ? 'border-[#6B3FA0] bg-[#6B3FA0]/5'
                        : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          NS: {p.serial_number || '-'}
                          {p.brand ? ` · ${p.brand}` : ''}{p.model ? ` ${p.model}` : ''}
                        </p>
                      </div>
                    </div>
                    {selected?.id === p.id && (
                      <Check className="h-4 w-4 text-[#6B3FA0] flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="sub-notes">Observações (opcional)</Label>
            <Input
              id="sub-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre a troca"
            />
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 rounded p-3">
            Ao confirmar, o substituto passa a constar como vendido para o mesmo cliente e o aparelho com defeito
            sai do estoque disponível para conserto.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !selected || !problem.trim()}
            className="bg-[#6B3FA0] hover:bg-[#5a2f8a] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" /> Confirmar Substituição
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}