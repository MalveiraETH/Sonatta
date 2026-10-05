import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { arredondar, reabrirSaldoNoContasReceber } from '../../shared/saldoVenda.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem estornar complementos' }, { status: 403 });
    }

    const { complementary_sale_id } = await req.json();
    if (!complementary_sale_id) {
      return Response.json({ error: 'Complemento não informado' }, { status: 400 });
    }

    const complemento = await base44.asServiceRole.entities.Sale.get(complementary_sale_id);
    if (!complemento) return Response.json({ error: 'Complemento não encontrado' }, { status: 404 });
    if (!complemento.is_complementary) {
      return Response.json({ error: 'Este lançamento não é um pagamento complementar' }, { status: 400 });
    }
    if (complemento.status === 'cancelado') {
      return Response.json({ error: 'Este complemento já foi estornado' }, { status: 400 });
    }

    const vendaOriginal = await base44.asServiceRole.entities.Sale.get(
      complemento.complementary_to_sale_id
    );
    if (!vendaOriginal) {
      return Response.json({ error: 'Venda original não encontrada' }, { status: 404 });
    }

    const valor = arredondar(complemento.total);
    const dataVencimento = complemento.sale_date || null;

    // Reabre o saldo da venda original e o lançamento correspondente em Contas a Receber.
    const novoSaldo = arredondar((vendaOriginal.pending_balance || 0) + valor);

    const vendaAtualizada = await base44.asServiceRole.entities.Sale.update(vendaOriginal.id, {
      pending_balance: novoSaldo,
      status: 'parcial',
      settled_date: null,
      pending_due_date: dataVencimento,
    });

    await reabrirSaldoNoContasReceber(
      base44,
      vendaOriginal.id,
      valor,
      dataVencimento,
      `Estorno do complemento ${complemento.sale_number}`
    );

    await base44.asServiceRole.entities.Sale.update(complemento.id, {
      status: 'cancelado',
      notes: `${complemento.notes ? complemento.notes + ' · ' : ''}Estornado por ${user.full_name || user.email || 'administrador'}`,
    });

    return Response.json({
      sale: vendaAtualizada,
      reversed_amount: valor,
      new_balance: novoSaldo,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}