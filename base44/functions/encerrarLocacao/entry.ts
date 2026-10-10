import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { todayISO } from "../../shared/rentalCharges.ts";

/**
 * Encerra uma locação de AASI.
 *
 * - Marca a locação como encerrada (data e motivo).
 * - Cancela as cobranças ainda pendentes com vencimento posterior ao encerramento,
 *   interrompendo novas cobranças e mantendo o histórico das já recebidas.
 * - Devolve o aparelho ao estoque (status 'disponivel') quando informado,
 *   registrando movimentação e auditoria.
 *
 * Executado com service role pois Rental/Product exigem admin no RLS.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { rental_id, termination_date, termination_reason, device_returned, device_return_condition, notes } =
      payload || {};

    if (!rental_id) return Response.json({ error: 'Informe a locação' }, { status: 400 });

    const rentalList = await base44.asServiceRole.entities.Rental.filter({ id: rental_id });
    const rental = rentalList[0];
    if (!rental) return Response.json({ error: 'Locação não encontrada' }, { status: 404 });
    if (rental.status !== 'ativa') {
      return Response.json({ error: 'Esta locação já foi encerrada' }, { status: 400 });
    }

    const endDate = termination_date || todayISO();
    const returnDevice = device_returned !== false;

    const updated = await base44.asServiceRole.entities.Rental.update(rental.id, {
      status: 'encerrada',
      termination_date: endDate,
      termination_reason: termination_reason || '',
      device_returned: returnDevice,
      device_return_condition: device_return_condition || '',
      end_date: rental.term_type === 'indeterminado' ? endDate : rental.end_date || endDate,
      notes: notes ? `${rental.notes ? `${rental.notes}\n` : ''}${notes}` : rental.notes || ''
    });

    // Cancela apenas as cobranças em aberto que ainda venceriam após o encerramento
    const pendingCharges = await base44.asServiceRole.entities.RentalCharge.filter({
      rental_id: rental.id,
      status: 'pendente'
    });
    const toCancel = pendingCharges.filter((charge) => (charge.due_date || '') > endDate);
    if (toCancel.length > 0) {
      await base44.asServiceRole.entities.RentalCharge.bulkUpdate(
        toCancel.map((charge) => ({ id: charge.id, status: 'cancelado' }))
      );
    }

    // Devolve o aparelho ao estoque
    let productFreed = false;
    if (returnDevice && rental.product_id) {
      const productList = await base44.asServiceRole.entities.Product.filter({ id: rental.product_id });
      const product = productList[0];
      if (product) {
        await base44.asServiceRole.entities.Product.update(product.id, {
          status: 'disponivel',
          rental_id: '',
          rental_number: '',
          rental_client_name: '',
          rental_start_date: null,
          returned_to_stock_date: endDate
        });
        await base44.asServiceRole.entities.StockMovement.create({
          product_id: product.id,
          product_name: product.name,
          type: 'entrada',
          quantity: 1,
          reason: `Devolução da locação ${rental.rental_number || ''} - ${rental.client_name || ''}`,
          sale_date: endDate
        });
        productFreed = true;
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Rental',
      entity_id: rental.id,
      action: 'edicao',
      description: `Locação ${rental.rental_number || ''} encerrada em ${endDate}`,
      details: {
        termination_date: endDate,
        termination_reason: termination_reason || '',
        charges_cancelled: toCancel.length,
        device_returned: returnDevice,
        device_return_condition: device_return_condition || '',
        performed_by: user.full_name || user.email
      }
    });

    return Response.json({
      success: true,
      rental: updated,
      charges_cancelled: toCancel.length,
      device_returned: productFreed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}