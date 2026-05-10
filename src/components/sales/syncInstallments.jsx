import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

/**
 * Generate installment records for a payment item from a sale.
 * Returns array of installment objects (not yet persisted).
 */
function buildInstallments(payment, sale, saleDate) {
  const method = payment.method;
  const numInstallments = (method === 'cartao_credito' || method === 'pix_parcelado')
    ? (payment.installments || 1)
    : 1;

  const grossTotal = Number(payment.amount) || 0;
  const feeRate = Number(payment.fee_rate) || 0;
  const feeAmountTotal = Number(payment.fee_amount) || 0;
  const netTotal = Number(payment.net_amount) || grossTotal;

  const grossPerInstallment = Math.round((grossTotal / numInstallments) * 100) / 100;
  const feePerInstallment = Math.round((feeAmountTotal / numInstallments) * 100) / 100;
  const netPerInstallment = Math.round((netTotal / numInstallments) * 100) / 100;

  const results = [];
  for (let i = 1; i <= numInstallments; i++) {
    // Adjust last installment for rounding
    const isLast = i === numInstallments;
    const gross = isLast
      ? Math.round((grossTotal - grossPerInstallment * (numInstallments - 1)) * 100) / 100
      : grossPerInstallment;
    const fee = isLast
      ? Math.round((feeAmountTotal - feePerInstallment * (numInstallments - 1)) * 100) / 100
      : feePerInstallment;
    const net = isLast
      ? Math.round((netTotal - netPerInstallment * (numInstallments - 1)) * 100) / 100
      : netPerInstallment;

    // Due date calculation
    let dueDate;
    if (method === 'cartao_credito') {
      const d = new Date(saleDate);
      d.setMonth(d.getMonth() + i);
      dueDate = d.toISOString().split('T')[0];
    } else if (method === 'pix_parcelado') {
      // first installment 30 days from sale, then monthly
      const d = new Date(saleDate);
      d.setMonth(d.getMonth() + i);
      dueDate = d.toISOString().split('T')[0];
    } else {
      // single payment: due on sale date
      dueDate = typeof saleDate === 'string' ? saleDate : format(saleDate, 'yyyy-MM-dd');
    }

    results.push({
      sale_id: sale.id,
      sale_number: sale.sale_number,
      client_id: sale.client_id,
      client_name: sale.client_name,
      payment_method: method,
      card_brand: payment.card_brand || '',
      fee_rate: feeRate,
      fee_amount: fee,
      gross_amount: gross,
      net_amount: net,
      installments_total: numInstallments,
      installment_number: i,
      due_date: dueDate,
      sale_date: typeof saleDate === 'string' ? saleDate : format(saleDate, 'yyyy-MM-dd'),
      original_amount: gross,
      paid_amount: 0,
      remaining_amount: gross,
      payment_status: 'pendente',
      payment_history: []
    });
  }
  return results;
}

/**
 * Create installments for a newly created sale.
 * Only for cartao_credito and pix_parcelado.
 */
export async function createInstallmentsForSale(sale, saleDate) {
  const payments = (sale.payment_details || []).filter(
    p => p.method === 'cartao_credito' || p.method === 'pix_parcelado'
  );
  for (const payment of payments) {
    const records = buildInstallments(payment, sale, saleDate);
    for (const rec of records) {
      await base44.entities.Installment.create(rec);
    }
  }
}

/**
 * Sync installments when a sale is edited.
 * Policy:
 * - Cancel all payments (reset to pending/overdue based on due_date)
 * - Delete all existing installments
 * - Recreate installments from new payment_details
 * Only cartao_credito and pix_parcelado generate installments.
 */
export async function syncInstallmentsForSale(sale, saleDate) {
  const existing = await base44.entities.Installment.filter({ sale_id: sale.id });

  // Step 1: Cancel all paid installments (reset to pending/overdue)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const inst of existing) {
    if (inst.payment_status === 'pago' || inst.payment_status === 'parcialmente_pago') {
      const dueDate = new Date(inst.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today;
      
      await base44.entities.Installment.update(inst.id, {
        paid_amount: 0,
        remaining_amount: inst.original_amount,
        payment_status: isOverdue ? 'atrasado' : 'pendente',
        last_payment_date: null,
        payment_history: []
      });
    }
  }

  // Step 2: Delete all installments
  for (const inst of existing) {
    await base44.entities.Installment.delete(inst.id);
  }

  // Step 3: Recreate installments from new payment_details
  await createInstallmentsForSale(sale, saleDate);
}