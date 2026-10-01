import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { maskCEP, onlyDigits } from '@/lib/masks';
import FieldError from '@/components/ui/FieldError';

/**
 * Campo de CEP que consulta o CEP externamente e devolve rua, bairro, cidade e UF.
 * A consulta nunca bloqueia o cadastro: quando o CEP não é confirmado, apenas avisa.
 */
export default function CepInput({ id = 'address_cep', value, onChange, onResolved, savedValue = '' }) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const lastQueried = useRef('');

  const digits = onlyDigits(value);
  const incomplete = digits.length > 0 && digits.length < 8 && digits !== onlyDigits(savedValue);
  // Nunca consulta (nem sobrescreve o endereço) sem o CEP ter sido digitado ou alterado
  const changedFromSaved = digits !== onlyDigits(savedValue);

  const lookup = async (cepDigits) => {
    if (lastQueried.current === cepDigits) return;
    lastQueried.current = cepDigits;
    setLoading(true);
    setNotice(null);
    try {
      const response = await base44.functions.invoke('consultarCEP', { cep: cepDigits });
      const data = response.data || {};
      if (data.status === 'ok') {
        onResolved(data);
        setNotice({ type: 'ok', text: 'Endereço preenchido pelo CEP — confira e ajuste se precisar.' });
      } else {
        setNotice({ type: 'warn', text: data.message || 'CEP não confirmado. Você pode salvar assim mesmo.' });
      }
    } catch (error) {
      setNotice({ type: 'warn', text: 'Não foi possível consultar o CEP agora. Você pode salvar assim mesmo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const masked = maskCEP(e.target.value);
    onChange(masked);
    const next = onlyDigits(masked);
    if (next.length < 8) {
      lastQueried.current = '';
      setNotice(null);
    } else {
      lookup(next);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={() => { if (digits.length === 8 && changedFromSaved) lookup(digits); }}
          placeholder="00000-000"
          maxLength={9}
          inputMode="numeric"
          className={incomplete ? 'border-red-400' : ''}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            consultando
          </span>
        )}
      </div>
      <FieldError message={incomplete ? 'CEP incompleto — informe os 8 dígitos.' : null} />
      {!loading && notice && (
        <p className={notice.type === 'ok' ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
          {notice.text}
        </p>
      )}
    </div>
  );
}