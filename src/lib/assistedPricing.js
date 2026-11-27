export function computeCosts(item, fixedCost) {
  const base =
    Number(item.product_cost || 0) + Number(item.icms || 0) + Number(item.ipi || 0);
  const fixed = item.include_fixed_cost === false ? 0 : Number(fixedCost || 0);
  return { total: Number((base + fixed).toFixed(2)) };
}

export function markupPctFor(billingCfg, category) {
  if (!billingCfg || !category) return null;
  const value = billingCfg[`markup_category_${category}`];
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

export function suggestedSale(cost, pct) {
  if (pct === null || pct === undefined) return null;
  return Number((cost + cost * (Number(pct) / 100)).toFixed(2));
}

export function referenceSalePrice(reference, billingCfg) {
  if (!reference || !billingCfg) return null;
  const fixed =
    reference.include_fixed_cost === false ? 0 : Number(billingCfg.fixed_cost || 0);
  const cost = Number(reference.cost || 0) + fixed;
  const pct = markupPctFor(billingCfg, reference.category);
  if (pct === null) return null;
  return Number((cost + cost * (pct / 100)).toFixed(2));
}

// Compara o preço calculado (custo da nota + markup) com o da tabela de referência
// e devolve sempre o maior valor como escolhido.
export function priceOptions(item, reference, billingCfg) {
  const { total } = computeCosts(item, billingCfg?.fixed_cost);
  const pct = markupPctFor(billingCfg, item.markup_category);
  const calculated = suggestedSale(total, pct);
  const table = referenceSalePrice(reference, billingCfg);

  if (calculated === null && table === null) {
    return { calculated: null, table: null, best: null, source: null, total };
  }
  if (calculated === null) {
    return { calculated: null, table, best: table, source: 'referencia', total };
  }
  if (table === null) {
    return { calculated, table: null, best: calculated, source: 'calculado', total };
  }
  return calculated >= table
    ? { calculated, table, best: calculated, source: 'calculado', total }
    : { calculated, table, best: table, source: 'referencia', total };
}

export function buildProductPayload(item, billingCfg) {
  const options = priceOptions(item, item.matched_reference, billingCfg);
  const { total } = computeCosts(item, billingCfg?.fixed_cost);
  const sale = Number(item.sale_price) > 0 ? Number(item.sale_price) : options.best ?? total;

  const payload = {
    stock_type: 'serializado',
    name: item.product_name.trim(),
    category: item.category || 'aparelho_auditivo',
    brand: item.brand || '',
    model: item.model || '',
    serial_number: item.serial_number.trim(),
    reference: item.reference || '',
    quantity: 1,
    product_cost: Number(item.product_cost) || 0,
    icms: Number(item.icms) || 0,
    ipi: Number(item.ipi) || 0,
    cost_price: total,
    sale_price: Number(sale.toFixed(2)),
    status: 'disponivel',
    nota_fiscal_entrada: item.nota_fiscal_entrada || '',
    entry_date: item.entry_date,
    warranty_years: Number(item.warranty_years || 0),
    power_type: item.power_type || 'bateria_recarregavel',
    include_fixed_cost: item.include_fixed_cost !== false,
    min_stock: 5,
  };

  if (item.markup_category) payload.markup_category = item.markup_category;
  return payload;
}