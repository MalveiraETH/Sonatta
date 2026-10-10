import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Search } from 'lucide-react';

/**
 * Lista pesquisável de clientes para seleção.
 */
export default function ClientSearchList({ value, onChange }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const all = await base44.entities.Client.list('full_name', 500);
        if (active) setClients(all);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const t = term.toLowerCase().trim();
  const filtered = (t
    ? clients.filter(c =>
        (c.full_name || '').toLowerCase().includes(t) ||
        (c.cpf || '').includes(t) ||
        (c.phone || '').includes(t)
      )
    : clients
  ).slice(0, 50);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">Nenhum cliente encontrado</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c)}
              className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                value?.id === c.id
                  ? 'border-[#6B3FA0] bg-[#6B3FA0]/5'
                  : 'border-transparent hover:bg-white'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.full_name}</p>
                <p className="text-xs text-slate-500">
                  {c.phone && <span>{c.phone}</span>}
                  {c.cpf && <span> · CPF: {c.cpf}</span>}
                </p>
              </div>
              {value?.id === c.id && (
                <Check className="h-4 w-4 text-[#6B3FA0] flex-shrink-0 ml-2" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}