// Contexto comercial das variáveis dinâmicas: venda, produtos (com número de
// série), formas de pagamento, parcelas, orçamento, contrato, locação e o
// último atendimento/teste do paciente. Tudo em modo "melhor esforço": se um
// registro não existir, os tokens correspondentes ficam sem valor.
import { base44 } from '@/api/base44Client';
import { isInstallmentMethod, PAYMENT_METHOD_LABELS } from '@/components/sales/paymentFees';
import {
  CONTRACT_STATUS_LABELS,
  PRODUCT_CATEGORY_LABELS,
  QUOTE_STATUS_LABELS,
  RECORD_TYPE_LABELS,
  RENTAL_STATUS_LABELS,
  RENTAL_TERM_LABELS,
  SALE_STATUS_LABELS,
  TEST_STATUS_LABELS,
  clean,
  countText,
  formatDate,
  joinList,
  labelOf,
  money,
  percent,
  validityUntil,
  warrantyLabel,
  warrantyUntil,
} from '@/lib/docVarsShared';

// Slots individuais de produtos (ex.: aparelho 1 e 2 de uma adaptação bilateral)
const MAX_PRODUCT_SLOTS = 4;

const best = async (fn, fallback) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const firstOf = (res) => (res?.items || [])[0] || null;

const dayOfDate = (date) => {
  const match = String(date || '').match(/^\d{4}-\d{2}-(\d{2})/);
  return match ? String(Number(match[1])) : '';
};

// ── Consultas ──
const loadSale = async (clientId) => {
  const main = await base44.entities.Sale.filter(
    { client_id: clientId, is_complementary: { $ne: true } },
    { sort: '-sale_date', limit: 1 }
  );
  const sale = firstOf(main);
  if (sale) return sale;
  const any = await base44.entities.Sale.filter(
    { client_id: clientId },
    { sort: '-sale_date', limit: 1 }
  );
  return firstOf(any);
};

const loadInstallments = async (saleId) => {
  const res = await base44.entities.Installment.filter(
    { sale_id: saleId },
    { sort: 'due_date', limit: 200 }
  );
  return res.items || [];
};

const loadProducts = async (clientId, productIds) => {
  const conditions = [];
  if (productIds.length) conditions.push({ id: { $in: productIds } });
  if (clientId) conditions.push({ client_id: clientId });
  if (!conditions.length) return [];
  const res = await base44.entities.Product.filter({ $or: conditions }, { limit: 100 });
  return res.items || [];
};

const loadLatest = (entity, query, sort) =>
  entity.filter(query, { sort, limit: 1 }).then(firstOf);

// ── Venda ──
function saleContext(sale) {
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  return {
    sale_number: clean(sale.sale_number),
    sale_date: formatDate(sale.sale_date),
    sale_status: labelOf(SALE_STATUS_LABELS, sale.status),
    sale_seller: clean(sale.seller_name),
    sale_nf: clean(sale.nota_fiscal),
    sale_referral: clean(sale.test_referral_name),
    sale_client_address: clean(sale.client_address),
    sale_notes: clean(sale.notes),
    sale_subtotal: money(sale.subtotal),
    sale_discount: money(sale.discount),
    sale_total: money(sale.total),
    sale_fee_total: money(sale.total_fee_amount),
    sale_net_total: money(sale.total_net_amount),
    sale_discount_percent: subtotal > 0 && discount > 0 ? percent((discount / subtotal) * 100) : '',
  };
}

// ── Produtos vendidos (nome, nº de série, marca, modelo, garantia) ──
function productContext(items, productsById, saleDate) {
  const rows = items.map((item) => {
    const product = productsById.get(item?.product_id) || {};
    const categoryKey = clean(product.category || item?.product_category);
    return {
      name: clean(item?.product_name) || clean(product.name),
      serial: clean(item?.serial_number),
      brand: clean(product.brand),
      model: clean(product.model),
      categoryKey,
      categoryLabel: labelOf(PRODUCT_CATEGORY_LABELS, categoryKey),
      quantity: countText(item?.quantity),
      unitPrice: money(item?.unit_price),
      total: money(item?.total),
      warranty: warrantyLabel(product.warranty_years),
      warrantyYears: product.warranty_years,
    };
  });
  if (!rows.length) return {};

  // O aparelho auditivo é o produto principal; sem ele, o primeiro item.
  const mainIndex = Math.max(
    0,
    rows.findIndex((row) => row.categoryKey === 'aparelho_auditivo')
  );
  const main = rows[mainIndex];
  const ctx = {
    product_count: countText(rows.length),
    product_name: main.name,
    product_serial: main.serial,
    product_brand: main.brand,
    product_model: main.model,
    product_category: main.categoryLabel,
    product_quantity: main.quantity,
    product_unit_price: main.unitPrice,
    product_total: main.total,
    product_warranty: main.warranty,
    product_warranty_until: warrantyUntil(saleDate, main.warrantyYears),
    products_list: joinList(
      rows.map((row) => (row.serial ? `${row.name} (SN ${row.serial})` : row.name))
    ),
    names_list: joinList(rows.map((row) => row.name)),
    serials_list: joinList(rows.map((row) => row.serial)),
  };

  rows.slice(0, MAX_PRODUCT_SLOTS).forEach((row, index) => {
    ctx[`product_${index + 1}_name`] = row.name;
    ctx[`product_${index + 1}_serial`] = row.serial;
  });
  return ctx;
}

// ── Pagamentos, formas e parcelas ──
function paymentContext(sale, installments) {
  const ctx = {};
  const payments = (Array.isArray(sale.payment_details) ? sale.payment_details : []).filter(
    (payment) => clean(payment.method) && Number(payment.amount) > 0
  );
  const list = Array.isArray(installments) ? installments : [];

  if (payments.length) {
    const labels = payments.map((payment) => labelOf(PAYMENT_METHOD_LABELS, payment.method));
    ctx.payment_methods = joinList(labels, ' + ');
    ctx.payment_method = labels[0];
    ctx.payments_list = joinList(
      payments.map((payment) => {
        const base = `${labelOf(PAYMENT_METHOD_LABELS, payment.method)} ${money(payment.amount)}`;
        return Number(payment.installments) > 1
          ? `${base} em ${countText(payment.installments)}x`
          : base;
      })
    );
  }

  const paidInstallments = list.filter((i) => i.payment_status === 'pago');
  const paidAtSale = payments
    .filter((payment) => !isInstallmentMethod(payment.method))
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const paidByInstallments = list.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const openByInstallments = list.reduce((sum, i) => sum + (Number(i.remaining_amount) || 0), 0);
  const pendingBalance = Number(sale.pending_balance) || 0;

  if (payments.length || list.length) {
    ctx.paid_amount = money(paidAtSale + paidByInstallments);
    ctx.remaining_amount = money(openByInstallments + pendingBalance);
    ctx.sale_balance = money(openByInstallments + pendingBalance);
  }
  if (pendingBalance) {
    ctx.sale_pending_balance = money(pendingBalance);
    ctx.sale_pending_due_date = formatDate(sale.pending_due_date);
  }

  const dueDates = list.map((i) => i.due_date).filter(Boolean).sort();
  const firstDue = dueDates[0] || clean(sale.pending_due_date);
  ctx.payment_first_due_date = formatDate(firstDue);
  ctx.payment_last_due_date = formatDate(dueDates[dueDates.length - 1]);
  ctx.payment_due_day = dayOfDate(firstDue);

  const openDueDates = list
    .filter((i) => i.payment_status !== 'pago' && i.payment_status !== 'cancelado')
    .map((i) => i.due_date)
    .filter(Boolean)
    .sort();
  ctx.next_due_date = formatDate(openDueDates[0]);

  if (payments.length || list.length) {
    const count = Math.max(
      1,
      ...payments.map((payment) => Number(payment.installments) || 1),
      ...list.map((i) => Number(i.installments_total) || 1)
    );
    ctx.installments_count = countText(count);

    const withInstallments = payments.find((payment) => Number(payment.installments) > 1);
    ctx.installment_value =
      money(list[0]?.gross_amount) ||
      (withInstallments
        ? money(
            (Number(withInstallments.amount) || 0) / (Number(withInstallments.installments) || 1)
          )
        : '');
  }

  ctx.installments_list = joinList(
    list.map((i) => {
      const position =
        Number(i.installments_total) > 1
          ? `${countText(i.installment_number)}/${countText(i.installments_total)} - `
          : '';
      const status = i.payment_status === 'pago' ? ' (pago)' : '';
      return `${position}${formatDate(i.due_date)} - ${money(i.gross_amount)}${status}`;
    })
  );
  if (list.length) {
    ctx.installments_paid_count = countText(paidInstallments.length);
    ctx.installments_paid_total = money(paidByInstallments);
    ctx.installments_open_total = money(openByInstallments);
  }

  const pix = payments.filter((p) => p.method === 'pix' || p.method === 'pix_parcelado');
  if (pix.length) {
    ctx.pix_amount = money(pix.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
    ctx.pix_installments = countText(
      pix.reduce((max, p) => Math.max(max, Number(p.installments) || 1), 1)
    );
    const pixDueDate = list
      .filter((i) => i.payment_method === 'pix_parcelado')
      .map((i) => i.due_date)
      .filter(Boolean)
      .sort()[0];
    ctx.pix_due_date = formatDate(pixDueDate) || formatDate(sale.sale_date);
  }

  const card = payments.find((p) => clean(p.card_brand));
  if (card) ctx.card_brand = clean(card.card_brand);
  const voucher = payments.find((p) => clean(p.voucher_code));
  if (voucher) ctx.voucher_code = clean(voucher.voucher_code);

  return ctx;
}

// ── Produtos/aparelhos do paciente: os vendidos para ele e os associados
// manualmente no estoque (sem duplicar o mesmo aparelho). ──
function clientDeviceContext(products, clientId, soldDevices) {
  const devices = [];
  const seen = new Set();
  const add = (key, name, serial) => {
    const identifier = clean(key) || clean(serial) || clean(name);
    if (!identifier || seen.has(identifier)) return;
    seen.add(identifier);
    devices.push({ name: clean(name), serial: clean(serial) });
  };

  soldDevices.forEach((device) => add(device.key, device.name, device.serial));
  products
    .filter((p) => p.client_id === clientId && p.status !== 'descartado')
    .forEach((p) => add(p.id, p.name, p.serial_number));

  if (!devices.length) return {};
  return {
    client_device_count: countText(devices.length),
    client_devices_list: joinList(
      devices.map((device) =>
        device.serial ? `${device.name} (SN ${device.serial})` : device.name
      )
    ),
    client_devices_serials: joinList(devices.map((device) => device.serial)),
  };
}

// ── Orçamento, contrato, atendimento, teste e locação ──
const quoteContext = (quote) => ({
  quote_number: clean(quote.quote_number),
  quote_date: formatDate(quote.created_date),
  quote_total: money(quote.total),
  quote_status: labelOf(QUOTE_STATUS_LABELS, quote.status),
  quote_validity_days: countText(quote.validity_days),
  quote_valid_until: validityUntil(quote.created_date, quote.validity_days),
  quote_notes: clean(quote.notes),
});

const contractContext = (contract) => ({
  contract_number: clean(contract.contract_number),
  contract_date: formatDate(contract.created_date),
  contract_total: money(contract.total_value),
  contract_status: labelOf(CONTRACT_STATUS_LABELS, contract.status),
  contract_payment_conditions: clean(contract.payment_conditions),
  contract_warranty_period: clean(contract.warranty_period),
  contract_signature_date: formatDate(contract.signature_date),
  contract_notes: clean(contract.notes),
});

const recordContext = (record) => ({
  record_date: formatDate(record.date),
  record_type: labelOf(RECORD_TYPE_LABELS, record.record_type),
  record_professional: clean(record.professional_name),
  record_complaint: clean(record.chief_complaint),
  record_notes: clean(record.notes),
  record_audiogram_notes: clean(record.audiogram_notes),
  record_next_steps: clean(record.next_steps),
});

function testContext(test) {
  const devices = Array.isArray(test.devices) ? test.devices : [];
  const first = devices[0] || {};
  return {
    test_number: clean(test.test_number),
    test_status: labelOf(TEST_STATUS_LABELS, test.status),
    test_professional: clean(test.professional_name),
    test_referral: clean(test.referral_professional_name),
    test_notes: clean(test.notes),
    start_date: formatDate(test.start_date),
    start_time: clean(test.start_time),
    end_date: formatDate(test.end_date),
    end_time: clean(test.end_time),
    device_name: clean(first.product_name),
    device_serial: clean(first.serial_number),
    devices_list: joinList(
      devices.map((device) =>
        clean(device.serial_number)
          ? `${clean(device.product_name)} (SN ${clean(device.serial_number)})`
          : clean(device.product_name)
      )
    ),
  };
}

const rentalContext = (rental, nextCharge) => ({
  rental_number: clean(rental.rental_number),
  rental_product: clean(rental.product_name),
  rental_serial: clean(rental.serial_number),
  rental_term_type: labelOf(RENTAL_TERM_LABELS, rental.term_type),
  rental_start_date: formatDate(rental.start_date),
  rental_end_date: formatDate(rental.end_date),
  rental_monthly_amount: money(rental.monthly_amount),
  rental_due_day: countText(rental.due_day),
  rental_payment_method: labelOf(PAYMENT_METHOD_LABELS, rental.payment_method),
  rental_status: labelOf(RENTAL_STATUS_LABELS, rental.status),
  rental_next_due_date: formatDate(nextCharge?.due_date),
});

// Reúne todas as variáveis comerciais do paciente.
export async function buildBusinessContext(client, saleOverride = null) {
  const clientId = clean(client?.id);
  if (!clientId) return {};

  // Uma venda específica pode ser informada (ex.: contrato de uma venda antiga);
  // sem ela, usa a venda mais recente do paciente.
  const sale = clean(saleOverride?.id) ? saleOverride : await best(() => loadSale(clientId), null);

  const [quote, contract, record, test, rental] = await Promise.all([
    best(() => loadLatest(base44.entities.Quote, { client_id: clientId }, '-created_date'), null),
    best(() => loadLatest(base44.entities.Contract, { client_id: clientId }, '-created_date'), null),
    best(() => loadLatest(base44.entities.MedicalRecord, { client_id: clientId }, '-date'), null),
    best(() => loadLatest(base44.entities.Test, { client_id: clientId }, '-created_date'), null),
    best(
      () => loadLatest(base44.entities.Rental, { client_id: clientId, status: 'ativa' }, '-start_date'),
      null
    ),
  ]);

  const items = Array.isArray(sale?.items) ? sale.items : [];
  const productIds = items.map((item) => clean(item.product_id)).filter(Boolean);
  const products = await best(() => loadProducts(clientId, productIds), []);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const installments = sale ? await best(() => loadInstallments(sale.id), []) : [];
  const nextCharge = rental
    ? await best(
        () =>
          loadLatest(
            base44.entities.RentalCharge,
            { rental_id: rental.id, status: 'pendente' },
            'due_date'
          ),
        null
      )
    : null;

  const soldDevices = items.map((item) => ({
    key: clean(item.product_id) || clean(item.serial_number),
    name: item.product_name,
    serial: item.serial_number,
  }));

  return {
    ...(sale ? saleContext(sale) : {}),
    ...(sale ? productContext(items, productsById, sale.sale_date) : {}),
    ...(sale ? paymentContext(sale, installments) : {}),
    ...clientDeviceContext(products, clientId, soldDevices),
    ...(quote ? quoteContext(quote) : {}),
    ...(contract ? contractContext(contract) : {}),
    ...(record ? recordContext(record) : {}),
    ...(test ? testContext(test) : {}),
    ...(rental ? rentalContext(rental, nextCharge) : {}),
  };
}