import { describe, it, expect } from 'vitest';

// Validators to test
const isValidCPF = (cpf) => {
  const cleaned = cpf?.replace(/\D/g, '');
  if (!cleaned || cleaned.length !== 11) return false;
  
  // Basic validation: not all same digits
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  return true;
};

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const isValidPhone = (phone) => {
  const cleaned = phone?.replace(/\D/g, '');
  return cleaned && cleaned.length >= 10 && cleaned.length <= 11;
};

describe('Validators', () => {
  describe('isValidCPF', () => {
    it('should validate correct CPF format', () => {
      expect(isValidCPF('123.456.789-01')).toBe(true);
      expect(isValidCPF('12345678901')).toBe(true);
    });

    it('should reject CPF with all same digits', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('00000000000')).toBe(false);
    });

    it('should reject invalid CPF length', () => {
      expect(isValidCPF('123.456.789')).toBe(false);
      expect(isValidCPF('12345678901234')).toBe(false);
    });

    it('should handle empty/null', () => {
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should handle empty', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate phone with 10-11 digits', () => {
      expect(isValidPhone('9199169210')).toBe(true);
      expect(isValidPhone('91991692102')).toBe(true);
    });

    it('should validate phone with formatting', () => {
      expect(isValidPhone('(91) 9 9169-2102')).toBe(true);
      expect(isValidPhone('+55 91 9 9169-2102')).toBe(true);
    });

    it('should reject phone with less than 10 digits', () => {
      expect(isValidPhone('123456')).toBe(false);
    });

    it('should reject phone with more than 11 digits', () => {
      expect(isValidPhone('919916921021')).toBe(false);
    });
  });
});