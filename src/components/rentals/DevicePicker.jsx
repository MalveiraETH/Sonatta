import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Search } from 'lucide-react';

/**
 * Lista pesquisável de aparelhos serializados disponíveis para locação.
 */
export default function DevicePicker({ value, onChange, includeProduct }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const page = await base44.entities.Product.filter(
          { stock_type: 'serializado', status: 'disponivel' },
          { sort: 'name', limit: 200 }
        );
        const list = page.items || [];
        if (includeProduct && includeProduct.id && !list.some((d) => d.id === includeProduct.id)) {
          list.unshift(includeProduct);
        }
        if (active) setDevices(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [includeProduct?.id]);

  const t = term.toLowerCase().trim();
  const filtered = (t
    ? devices.filter((d) =>
        (d.name || '').toLowerCase().includes(t) ||
        (d.serial_number || '').toLowerCase().includes(t) ||
        (d.brand || '').toLowerCase().includes(t) ||
        (d.model || '').toLowerCase().includes(t)
      )
    : devices
  ).slice(0, 60);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, marca ou nº de série..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-44 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">
            Nenhum aparelho disponível no estoque
          </p>
        ) : (
          filtered.map((device) => (
            <button
              key={device.id}
              type="button"
              onClick={() => onChange(device)}
              className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                value?.id === device.id
                  ? 'border-[#6B3FA0] bg-[#6B3FA0]/5'
                  : 'border-transparent hover:bg-white'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {device.name}
                  {device.brand ? <span className="text-slate-500"> · {device.brand}</span> : null}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  NS: {device.serial_number || '—'}
                  {device.model ? <span> · {device.model}</span> : null}
                </p>
              </div>
              {value?.id === device.id && (
                <Check className="h-4 w-4 text-[#6B3FA0] flex-shrink-0 ml-2" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}