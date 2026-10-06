import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Correção dos lançamentos de "saldo pendente" que já foram quitados.
// O saldo a pagar não deve existir no Contas a Receber: só cartão de crédito e PIX parcelado entram lá.
// Remove os lançamentos de saldo de vendas cujo saldo já foi zerado (ou que foram financiadas por um pagamento complementar).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const installments = await base44.asServiceRole.entities.Installment.filter({ payment_method: 'saldo_pendente' });
    const removed = [];

    for (const inst of installments) {
      let sale = null;
      try {
        sale = await base44.asServiceRole.entities.Sale.get(inst.sale_id);
      } catch (e) {
        sale = null;
      }

      const complements = await base44.asServiceRole.entities.Sale.filter({
        complementary_to_sale_id: inst.sale_id,
        is_complementary: true
      });

      const pending = Number(sale?.pending_balance) || 0;
      const financed = complements.some(c => c.status !== 'cancelado');
      const settled = !sale || pending <= 0.01;

      if (financed || settled) {
        await base44.asServiceRole.entities.Installment.delete(inst.id);

        if (sale && sale.status === 'parcial') {
          await base44.asServiceRole.entities.Sale.update(sale.id, {
            pending_balance: 0,
            pending_due_date: null,
            status: 'pago'
          });
        }

        removed.push({
          installment_id: inst.id,
          sale_number: inst.sale_number,
          client_name: inst.client_name,
          amount: inst.gross_amount,
          payment_status: inst.payment_status,
          complements: complements.map(c => c.sale_number)
        });
      }
    }

    return Response.json({ removedCount: removed.length, removed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}