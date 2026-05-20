import { describe, it, expect } from 'vitest';

// Formatters to test
const formatCPF = (cpf) => {
  return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
};

const formatPhone = (phone) => {
  return phone?.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') || '';
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

describe('Formatters', () => {
  describe('formatCPF', () => {
    it('should format CPF correctly', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should handle empty CPF', () => {
      expect(formatCPF('')).toBe('');
      expect(formatCPF(null)).toBe('');
    });

    it('should handle CPF without spaces', () => {
      expect(formatCPF('98765432100')).toBe('987.654.321-00');
    });
  });

  describe('formatPhone', () => {
    it('should format phone correctly', () => {
      expect(formatPhone('5192991692102')).toBe('(51) 9299-1692102');
    });

    it('should handle empty phone', () => {
      expect(formatPhone('')).toBe('');
      expect(formatPhone(null)).toBe('');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in BRL', () => {
      expect(formatCurrency(1000)).toContain('R$');
      expect(formatCurrency(1000)).toContain('1.000');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toContain('R$');
    });

    it('should handle null', () => {
      expect(formatCurrency(null)).toContain('R$');
      expect(formatCurrency(null)).toContain('0');
    });

    it('should handle decimal values', () => {
      const result = formatCurrency(99.99);
      expect(result).toContain('R$');
      expect(result).toContain('99');
    });
  });
});