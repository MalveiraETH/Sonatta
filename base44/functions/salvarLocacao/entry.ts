import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { dueDateForPeriod, todayISO } from "../../shared/rentalCharges.ts";

/**
 * Cria ou edita uma locação de AASI.
 *
 * - Ao criar: valida o aparelho disponível, reserva o aparelho no estoque,
 *   gera o número da locação e registra movimentação + auditoria.
 * - Ao editar: permite trocar o aparelho (libera o antigo e reserva o novo) e
 *   recalcula as cobranças ainda em aberto (valor e vencimento).
 * - As cobranças mensais são geradas pela função gerarCobrancasLocacao.
 *
 * Executado com service role pois Rental/Product exigem admin no RLS.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const {
      id,
      client_id,
      client_name,
      client_cpf,
      client_phone,
      product_id,
      service_id,
      service_name,
      term_type,
      start_date,
      end_date,
      monthly_amount,
      due_day,
      payment_method,
      notes
    } = payload || {};

    if (!client_id) return Response.json({ error: 'Informe o cliente da locação' }, { status: 400 });
    if (!product_id) return Response.json({ error: 'Informe o aparelho da locação' }, { status: 400 });
    if (!start_date) return Response.json({ error: 'Informe a data de início' }, { status: 400 });
    if (!monthly_amount || Number(monthly_amount) <= 0) {
      return Response.json({ error: 'Informe o valor mensal da locação' }, { status: 400 });
    }
    if (!due_day) return Response.json({ error: 'Informe o dia de vencimento' }, { status: 400 });

    const rentalData = {
      client_id,
      client_name: client_name || '',
      client_cpf: client_cpf || '',
      client_phone: client_phone || '',
      product_id,
      service_id: service_id || '',
      service_name: service_name || '',
      term_type: term_type === 'indeterminado' ? 'indeterminado' : 'determinado',
      start_date,
      end_date: term_type === 'indeterminado' ? null : end_date || null,
      monthly_amount: Number(monthly_amount),
      due_day: Number(due_day),
      payment_method: payment_method || 'pix',
      notes: notes || ''
    };

    const today = todayISO();

    // ---------- EDIÇÃO ----------
    if (id) {
      const existingList = await base44.asServiceRole.entities.Rental.filter({ id });
      const current = existingList[0];
      if (!current) return Response.json({ error: 'Locação não encontrada' }, { status: 404 });
      if (current.status !== 'ativa') {
        return Response.json({ error: 'Somente locações ativas podem ser editadas' }, { status: 400 });
      }

      const productChanged = current.product_id !== product_id;
      let newProduct = null;

      if (productChanged) {
        const productList = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        newProduct = productList[0];
        if (!newProduct) return Response.json({ error: 'Aparelho não encontrado' }, { status: 404 });
        if (newProduct.status !== 'disponivel') {
          return Response.json({ error: 'O aparelho selecionado não está disponível para locação' }, { status: 400 });
        }

        if (current.product_id) {
          const oldList = await base44.asServiceRole.entities.Product.filter({ id: current.product_id });
          const oldProduct = oldList[0];
          if (oldProduct) {
            await base44.asServiceRole.entities.Product.update(oldProduct.id, {
              status: 'disponivel',
              rental_id: '',
              rental_number: '',
              rental_client_name: '',
              rental_start_date: null
            });
            await base44.asServiceRole.entities.StockMovement.create({
              product_id: oldProduct.id,
              product_name: oldProduct.name,
              type: 'entrada',
              quantity: 1,
              reason: `Troca de aparelho na locação ${current.rental_number || ''} - devolvido ao estoque`,
              sale_date: today
            });
          }
        }

        rentalData.product_name = newProduct.name || '';
        rentalData.serial_number = newProduct.serial_number || '';
        rentalData.product_reference = newProduct.reference || '';

        await base44.asServiceRole.entities.Product.update(newProduct.id, {
          status: 'reservado',
          rental_id: current.id,
          rental_number: current.rental_number || '',
          rental_client_name: rentalData.client_name,
          rental_start_date: rentalData.start_date
        });
        await base44.asServiceRole.entities.StockMovement.create({
          product_id: newProduct.id,
          product_name: newProduct.name,
          type: 'saida',
          quantity: 1,
          reason: `Locação ${current.rental_number || ''} - ${rentalData.client_name}`,
          sale_date: today
        });
      } else {
        const productList = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        const sameProduct = productList[0];
        if (sameProduct) {
          rentalData.product_name = sameProduct.name || '';
          rentalData.serial_number = sameProduct.serial_number || '';
          rentalData.product_reference = sameProduct.reference || '';
          await base44.asServiceRole.entities.Product.update(sameProduct.id, {
            rental_client_name: rentalData.client_name,
            rental_start_date: rentalData.start_date
          });
        }
      }

      const updated = await base44.asServiceRole.entities.Rental.update(id, rentalData);

      // Recalcula as cobranças ainda em aberto (valor e vencimento)
      const openCharges = await base44.asServiceRole.entities.RentalCharge.filter({
        rental_id: id,
        status: 'pendente'
      });
      if (openCharges.length > 0) {
        await base44.asServiceRole.entities.RentalCharge.bulkUpdate(
          openCharges.map((charge) => ({
            id: charge.id,
            amount: rentalData.monthly_amount,
            remaining_amount: rentalData.monthly_amount,
            due_date: dueDateForPeriod(charge.period, rentalData.due_day, rentalData.start_date),
            payment_method: rentalData.payment_method
          }))
        );
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'Rental',
        entity_id: id,
        action: 'edicao',
        description: `Locação ${current.rental_number || ''} atualizada`,
        details: {
          changed_product: productChanged,
          monthly_amount: rentalData.monthly_amount,
          due_day: rentalData.due_day,
          charges_updated: openCharges.length,
          performed_by: user.full_name || user.email
        }
      });

      return Response.json({ success: true, rental: updated, created: false });
    }

    // ---------- CRIAÇÃO ----------
    const productList = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    const product = productList[0];
    if (!product) return Response.json({ error: 'Aparelho não encontrado' }, { status: 404 });
    if (product.status !== 'disponivel') {
      return Response.json(
        { error: 'O aparelho selecionado não está disponível para locação' },
        { status: 400 }
      );
    }

    const lastRentals = await base44.asServiceRole.entities.Rental.list('-created_date', 1);
    const lastNumber = lastRentals[0]?.rental_number || '';
    const lastDigits = Number((lastNumber.match(/(\d+)$/) || [])[1] || 0);
    const rental_number = `LOC-${String(lastDigits + 1).padStart(4, '0')}`;

    const rental = await base44.asServiceRole.entities.Rental.create({
      ...rentalData,
      rental_number,
      product_name: product.name || '',
      serial_number: product.serial_number || '',
      product_reference: product.reference || '',
      status: 'ativa',
      device_returned: false,
      created_by_name: user.full_name || user.email || ''
    });

    await base44.asServiceRole.entities.Product.update(product.id, {
      status: 'reservado',
      rental_id: rental.id,
      rental_number,
      rental_client_name: rentalData.client_name,
      rental_start_date: rentalData.start_date
    });

    await base44.asServiceRole.entities.StockMovement.create({
      product_id: product.id,
      product_name: product.name,
      type: 'saida',
      quantity: 1,
      reason: `Locação ${rental_number} - ${rentalData.client_name}`,
      sale_date: rentalData.start_date
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Rental',
      entity_id: rental.id,
      action: 'criacao',
      description: `Locação ${rental_number} criada para ${rentalData.client_name} (aparelho NS ${product.serial_number || '-'})`,
      details: {
        rental_number,
        client_id: rentalData.client_id,
        product_id: product.id,
        serial_number: product.serial_number || '',
        monthly_amount: rentalData.monthly_amount,
        due_day: rentalData.due_day,
        term_type: rentalData.term_type,
        performed_by: user.full_name || user.email
      }
    });

    return Response.json({ success: true, rental, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}