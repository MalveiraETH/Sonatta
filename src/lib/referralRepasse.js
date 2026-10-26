// Regra do repasse de indicação.
// Os percentuais vêm de Configurações → Custos e Tarifas (AppSettings / billing_config).
// Base líquida = valor total da venda - taxa de cartão - imposto
// Repasse = base líquida × percentual de indicação

import { base44 } from '@/api/base44Client';

export const DEFAULT_BILLING_CONFIG = {
  credit_card_fee: 0,
  tax_percentage: 0,
  referral_percentage: 10,
};

// Percentuais usados no cálculo (com fallback para os padrões)
export const referralRates = (config = {}) => ({
  cardFeePercent: Number(config?.credit_card_fee) || 0,
  taxPercent: Number(config?.tax_percentage) || 0,
  referralPercent: Number(config?.referral_percentage ?? DEFAULT_BILLING_CONFIG.referral_percentage) || 0,
});

// Carrega a configuração salva na página de Configurações
export async function loadBillingConfig() {
  const settings = await base44.entities.AppSettings.filter({ setting_key: 'billing_config' });
  return { ...DEFAULT_BILLING_CONFIG, ...(settings?.[0]?.setting_value || {}) };
}

/**
 * @param {number} grossTotal Valor total da venda
 * @param {object} config Configuração de custos e tarifas
 * @returns {{ gross:number, cardFee:number, tax:number, base:number, referral:number,
 *             referralPercent:number, cardFeePercent:number, taxPercent:number }}
 */
export function calcReferralRepasse(grossTotal, config = {}) {
  const { cardFeePercent, taxPercent, referralPercent } = referralRates(config);
  const gross = Number(grossTotal) || 0;
  const cardFee = (gross * cardFeePercent) / 100;
  const tax = (gross * taxPercent) / 100;
  const base = gross - cardFee - tax;
  const referral = (base * referralPercent) / 100;
  return { gross, cardFee, tax, base, referral, referralPercent, cardFeePercent, taxPercent };
}