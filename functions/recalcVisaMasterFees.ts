import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const VISA_MASTER_CREDIT_RATES = [
  { installments: 1, rate: 2.79 },
  { installments: 2, rate: 3.13 },
  { installments: 3, rate: 3.13 },
  { installments: 4, rate: 3.13 },
  { installments: 5, rate: 3.13 },
  { installments: 6, rate: 3.13 },
  { installments: 7, rate: 3.41 },
  { installments: 8, rate: 3.41 },
  { installments: 9, rate: 3.41 },
  { installments: 10, rate: 3.41 },
  { installments: 11, rate: 3.41 },
  { installments: 12, rate: 3.41 },
  { installments: 13, rate: 3.41 },
  { installments: 14, rate: 3.41 },
  { installments: 15, rate: 3.41 },
  { installments: 16, rate: 3.41 },
  { installments: 17, rate: 3.41 },
  { installments: 18, rate: 3.41 },
];

const VISA_MASTER_DEBIT_RATE = 1.55;

function getNewRate(method, installments) {
  if (method === 'cartao_debito') return VISA_MASTER_DEBIT_RATE;
  if (method === 'cartao_credito') {
    const entry = VISA_MASTER_CREDIT_RATES.find(r => r.installments === installments);
    return entry ? entry.rate : VISA_MASTER_CREDIT_RATES[VISA_MASTER_CREDIT_RATES.length - 1].rate;
  }
  return null;
}

function isVisaMaster(brand) {
  if (!brand) return false;
  const b = brand.toUpperCase();
  return b.includes('VISA') || b.includes('MASTER');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allSales = await base44.asServiceRole.entities.Sale.list('-created_date', 500);

    const toUpdate = [];
    const dryRun = [];

    for (const sale of allSales) {
      const details = sale.payment_details || [];
      if (!details.some(d => isVisaMaster(d.card_brand))) continue;

      let changed = false;
      const newDetails = details.map(d => {
        if (!isVisaMaster(d.card_brand)) return d;
        const newRate = getNewRate(d.method, d.installments);
        if (newRate === null || newRate === d.fee_rate) return d;
        changed = true;
        const feeAmount = parseFloat(((d.amount * newRate) / 100).toFixed(2));
        const netAmount = parseFloat((d.amount - feeAmount).toFixed(2));
        return { ...d, fee_rate: newRate, fee_amount: feeAmount, net_amount: netAmount };
      });

      if (!changed) continue;

      const totalFeeAmount = parseFloat(newDetails.reduce((s, d) => s + (d.fee_amount || 0), 0).toFixed(2));
      const totalNetAmount = parseFloat(newDetails.reduce((s, d) => s + (d.net_amount || 0), 0).toFixed(2));

      dryRun.push({ id: sale.id, sale_number: sale.sale_number, old_fee: sale.total_fee_amount, new_fee: totalFeeAmount });
      toUpdate.push({ id: sale.id, payment_details: newDetails, total_fee_amount: totalFeeAmount, total_net_amount: totalNetAmount });
    }

    for (const upd of toUpdate) {
      await base44.asServiceRole.entities.Sale.update(upd.id, {
        payment_details: upd.payment_details,
        total_fee_amount: upd.total_fee_amount,
        total_net_amount: upd.total_net_amount,
      });
    }

    return Response.json({ updated: toUpdate.length, details: dryRun });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});