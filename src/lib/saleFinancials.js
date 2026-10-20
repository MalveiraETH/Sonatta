// Indicadores financeiros da venda usados nos relatórios.

// Custo Total (R$) do produto — o mesmo campo calculado no formulário
// (Custo do Produto + ICMS + IPI + Custo Operacional).
export const productTotalCost = (product) => {
  if (!product) return 0;
  if (product.cost_price) return product.cost_price;
  return (product.product_cost || 0) + (product.icms || 0) + (product.ipi || 0);
};

// Valor líquido da venda: soma das formas de pagamento já descontadas as taxas.
export const saleNetTotal = (sale) => {
  if (sale.payment_details && sale.payment_details.length > 0) {
    return sale.payment_details.reduce((sum, pd) => {
      const feeRate = pd.fee_rate || 0;
      const isCard = ['cartao_credito', 'cartao_debito'].includes(pd.method);
      return sum + (isCard && feeRate > 0 ? (pd.amount || 0) * (1 - feeRate / 100) : (pd.amount || 0));
    }, 0);
  }
  return sale.total_net_amount || sale.total || 0;
};

// Custo dos produtos vendidos (Custo Total do produto de cada item).
export const saleProductCost = (sale, products = []) =>
  (sale.items || []).reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id)
      || (item.serial_number ? products.find(p => p.serial_number === item.serial_number) : null);
    return sum + productTotalCost(product) * (item.quantity || 1);
  }, 0);

// Resultado líquido total = líquido da venda - repasse de indicação - custo dos produtos.
export const saleFinancials = (sale, products = [], referralRepasse = 0) => {
  const net = saleNetTotal(sale);
  const cost = saleProductCost(sale, products);
  return { net, cost, repasse: referralRepasse, result: net - referralRepasse - cost };
};