// Cálculo de taxas de cartão/PIX parcelado e rótulos das formas de pagamento.
// Fonte única usada pelo formulário de venda e pela quitação de saldo.

export const PAYMENT_METHOD_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX à Vista',
  pix_parcelado: 'PIX Parcelado',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência'
};

// Somente cartão de crédito e PIX parcelado geram parcelas no Contas a Receber.
export const isInstallmentMethod = (method) =>
  method === 'cartao_credito' || method === 'pix_parcelado';

// Reúne as bandeiras de todos os cadastros ativos de um tipo
export function getAggregatedBrands(paymentTypes, method) {
  const allBrands = [];
  const seen = new Set();
  for (const pt of paymentTypes.filter(p => p.type === method)) {
    for (const b of (pt.card_brands || [])) {
      if (b.brand && !seen.has(b.brand)) {
        seen.add(b.brand);
        allBrands.push(b);
      }
    }
  }
  return allBrands;
}

// Procura a configuração de uma bandeira em todos os cadastros daquele tipo
export function findBrandConfig(paymentTypes, method, brand) {
  for (const pt of paymentTypes.filter(p => p.type === method)) {
    const found = (pt.card_brands || []).find(b => b.brand === brand);
    if (found) return found;
  }
  return null;
}

// Taxa de crédito por bandeira + número de parcelas
export function getCreditRate(paymentTypes, method, brand, installments) {
  if (!brand) return 0;
  const brandData = findBrandConfig(paymentTypes, method, brand);
  if (!brandData) return 0;
  const ir = (brandData.installment_rates || []).find(r => Number(r.installments) === Number(installments));
  return ir ? Number(ir.rate) : 0;
}

// Taxa de débito por bandeira
export function getDebitRate(paymentTypes, brand) {
  if (!brand) return 0;
  const brandData = findBrandConfig(paymentTypes, 'cartao_debito', brand);
  return brandData ? Number(brandData.rate) : 0;
}

// Enriquece os pagamentos com fee_rate/fee_amount/net_amount e devolve o total de taxas
export function calcPaymentFees(paymentTypes, payments) {
  const enriched = payments.map(p => {
    let feeRate = 0;
    if (p.method === 'cartao_debito' && p.card_brand) {
      feeRate = getDebitRate(paymentTypes, p.card_brand);
    } else if (p.method === 'cartao_credito' && p.card_brand) {
      feeRate = getCreditRate(paymentTypes, 'cartao_credito', p.card_brand, p.installments || 1);
    }
    const amount = Number(p.amount) || 0;
    const feeAmount = Number(((amount * feeRate) / 100).toFixed(2));
    const netAmount = Number((amount - feeAmount).toFixed(2));
    return { ...p, fee_rate: feeRate, fee_amount: feeAmount, net_amount: netAmount };
  });
  const totalFeeAmount = Number(enriched.reduce((s, p) => s + p.fee_amount, 0).toFixed(2));
  return { enriched, totalFeeAmount };
}