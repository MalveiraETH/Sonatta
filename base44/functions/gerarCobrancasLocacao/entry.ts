import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { periodsFromStartToNow, dueDateForPeriod, todayISO } from "../../shared/rentalCharges.ts";

/**
 * Gera as cobranças mensais das locações ativas (contas a receber).
 *
 * - Idempotente: só cria a cobrança de um período que ainda não existe para a locação.
 * - Catch-up: cria todos os meses em aberto desde o início da locação até o mês atual.
 * - Respeita o prazo definido (não gera após o término) e ignora locações encerradas.
 * - Pode ser chamada para uma locação específica (rental_id) ou para todas as ativas.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    const rentalId = payload?.rental_id;

    const rentals = rentalId
      ? await base44.asServiceRole.entities.Rental.filter({ id: rentalId })
      : await base44.asServiceRole.entities.Rental.filter({ status: 'ativa' });

    const reference = todayISO();
    let created = 0;
    let skipped = 0;
    const details = [];

    for (const rental of rentals) {
      if (!rental.start_date || !rental.monthly_amount) {
        skipped++;
        continue;
      }
      if (rental.status !== 'ativa') {
        skipped++;
        continue;
      }

      const existing = await base44.asServiceRole.entities.RentalCharge.filter({ rental_id: rental.id });
      const existingPeriods = new Set(existing.map((c) => c.period));

      const periods = periodsFromStartToNow(
        rental.start_date,
        rental.end_date,
        reference,
        rental.term_type || 'indeterminado'
      );

      const toCreate = periods
        .filter((period) => !existingPeriods.has(period))
        .map((period) => ({
          rental_id: rental.id,
          rental_number: rental.rental_number || '',
          client_id: rental.client_id,
          client_name: rental.client_name || '',
          product_name: rental.product_name || '',
          serial_number: rental.serial_number || '',
          period,
          due_date: dueDateForPeriod(period, rental.due_day || 10, rental.start_date),
          amount: rental.monthly_amount,
          paid_amount: 0,
          remaining_amount: rental.monthly_amount,
          status: 'pendente',
          payment_method: rental.payment_method || '',
          notes: `Locação ${rental.rental_number || ''} - ${period.split('-').reverse().join('/')}`
        }));

      if (toCreate.length > 0) {
        await base44.asServiceRole.entities.RentalCharge.bulkCreate(toCreate);
        created += toCreate.length;
        details.push({ rental_number: rental.rental_number || '', created: toCreate.length });
      }
    }

    return Response.json({
      success: true,
      rentals_checked: rentals.length,
      created,
      skipped,
      details
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}