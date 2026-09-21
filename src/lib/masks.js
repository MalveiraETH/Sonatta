/**
 * Máscaras e validações para CPF, CNPJ, CEP, telefone e valores monetários.
 * Use em conjunto com os inputs dos formulários para garantir formatação
 * consistente e evitar erros de digitação.
 */

// ── Helpers ──

/** Remove tudo que não for dígito */
export const onlyDigits = (value) => (value || '').replace(/\D/g, '');

// ── CPF ── (11 dígitos → 000.000.000-00)

export const maskCPF = (value) => {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const isValidCPF = (value) => {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(d[i - 1]) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  if (rest !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(d[i - 1]) * (12 - i);
  rest = (sum * 10) % 11; if (rest === 10) rest = 0;
  return rest === parseInt(d[10]);
};

// ── CNPJ ── (14 dígitos → 00.000.000/0000-00)

export const maskCNPJ = (value) => {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const isValidCNPJ = (value) => {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(d[i]) * weights[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (calc(12) !== parseInt(d[12])) return false;
  return calc(13) === parseInt(d[13]);
};

// ── Documento (CPF ou CNPJ automático) ──

export const maskDocument = (value) => {
  const d = onlyDigits(value);
  return d.length <= 11 ? maskCPF(d) : maskCNPJ(d);
};

export const isValidDocument = (value) => {
  const d = onlyDigits(value);
  if (!d) return true; // vazio = válido (campo opcional)
  return d.length <= 11 ? isValidCPF(d) : isValidCNPJ(d);
};

// ── CEP ── (8 dígitos → 00000-000)

export const maskCEP = (value) => {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
};

export const isValidCEP = (value) => onlyDigits(value).length === 8;

// ── Telefone ── (10-11 dígitos → (00) 00000-0000)

export const maskPhone = (value) => {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

// ── Moeda (R$) ──

/**
 * Formata um número para exibição no padrão brasileiro: "1.234,56"
 */
export const formatBRL = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Converte string digitada (com vírgula ou ponto) em número float.
 * Aceita "1234,56", "1.234,56", "1234.56", "1234".
 */
export const parseCurrency = (str) => {
  if (str == null || str === '') return 0;
  const s = String(str).trim();
  // Remove tudo exceto dígitos, vírgula e ponto
  const clean = s.replace(/[^\d.,]/g, '');
  // Se há vírgula e ponto, assume vírgula como decimal (formato BR)
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Se há apenas vírgula, é o separador decimal
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
};

/**
 * Formata string parcial enquanto o usuário digita, para exibição no input.
 * Recebe o texto bruto do input e retorna "1.234,56" (parcial ok).
 */
export const maskCurrencyInput = (str) => {
  if (str == null) return '';
  // Remove tudo que não é dígito
  let d = String(str).replace(/\D/g, '');
  if (!d) return '';
  // Remove zeros à esquerda excessivos (mantém um se for só zero)
  d = d.replace(/^0+(\d)/, '$1');
  // Garante pelo menos 3 dígitos para ter centavos (últimos 2 = centavos)
  if (d.length < 3) {
    // 0,0X ou 0,X
    const padded = d.padStart(3, '0');
    const cents = padded.slice(-2);
    const reais = padded.slice(0, -2).replace(/^0+/, '') || '0';
    return `0,${cents}`;
  }
  const cents = d.slice(-2);
  let reais = d.slice(0, -2);
  // Adiciona separador de milhar
  reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reais},${cents}`;
};