import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { maskCurrencyInput, parseCurrency, formatBRL } from '@/lib/masks';

/**
 * Input de valor monetário (R$) com formatação brasileira automática.
 * - Exibe "1.234,56" enquanto o usuário digita
 * - onChange recebe um number (float)
 * - value pode ser number ou string numérica
 *
 * Props: todas as props de <Input> + onChange(number).
 */
export default function CurrencyInput({ value, onChange, onFocus, onBlur, className, placeholder, disabled, ...rest }) {
  // value pode vir como number (do estado) ou string
  const toDisplay = (val) => {
    if (val == null || val === '') return '';
    const n = typeof val === 'number' ? val : parseCurrency(val);
    if (!n && n !== 0) return '';
    return maskCurrencyInput(String(Math.round(n * 100)));
  };

  const [display, setDisplay] = useState(toDisplay(value));

  // Sincroniza quando o value externo muda (ex: ao editar registro existente)
  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const masked = maskCurrencyInput(raw);
    setDisplay(masked);
    if (onChange) onChange(parseCurrency(masked));
  };

  const handleFocus = (e) => {
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    // Re-formata com 2 casas decimais garantidas
    const n = parseCurrency(display);
    if (n || display !== '') {
      setDisplay(n ? formatBRL(n) : '');
    }
    if (onBlur) onBlur(e);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder || '0,00'}
      disabled={disabled}
      className={className}
      {...rest}
    />
  );
}