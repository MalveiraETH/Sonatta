import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  arredondar,
  hojeISO,
  gerarNumeroVenda,
  aplicarRecebimentoNoSaldo,
} from '../../shared/saldoVenda.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sale_id, amount, payment_date, method } = await req.json();

    if (!sale_id) return Response.json({ error: 'Venda não informada' }, { status: 400 });

    const venda = await base44.asServiceRole.entities.Sale.get(sale_id);
    if (!venda) return Response.json({ error: 'Venda não encontrada' }, { status: 404 });
    if (venda.status === 'cancelado') {
      return Response.json({ error: 'Venda cancelada não pode ser quitada' }, { status: 400 });
    }

    const saldoAtual = arredondar(venda.pending_balance);
    if (saldoAtual <= 0) {
      return Response.json({ error: 'Esta venda não possui saldo pendente' }, { status: 400 });
    }

    const valor = arredondar(amount);
    if (!(valor > 0)) return Response.json({ error: 'Informe o valor recebido' }, { status: 400 });

    const dataRecebimento = payment_date || hojeISO();
    const formaPagamento = method || 'pix';
    const numeroComplemento = gerarNumeroVenda(dataRecebimento);

    // 1. Registra o recebimento como lançamento complementar vinculado à venda original.
    //    O valor é sempre o das formas de pagamento informadas (nunca um campo já existente).
    const complemento = await base44.asServiceRole.entities.Sale.create({
      sale_number: numeroComplemento,
      sale_date: dataRecebimento,
      client_id: venda.client_id,
      client_name: venda.client_name,
      client_cpf: venda.client_cpf || '',
      client_phone: venda.client_phone || '',
      client_email: venda.client_email || '',
      client_address: venda.client_address || '',
      items: [],
      subtotal: valor,
      discount: 0,
      total: valor,
      total_fee_amount: 0,
      total_net_amount: valor,
      payment_details: [
        {
          method: formaPagamento,
          amount: valor,
          installments: 1,
          status: 'pago',
          card_brand: '',
          fee_rate: 0,
          fee_amount: 0,
          net_amount: valor,
        },
      ],
      seller_id: user.id || '',
      seller_name: user.full_name || '',
      status: 'pago',
      is_complementary: true,
      complementary_to_sale_id: venda.id,
      complementary_to_sale_number: venda.sale_number,
      notes: `Quitação de saldo da venda ${venda.sale_number}`,
    });

    // 2. Baixa (total ou parcial) o lançamento do saldo em Contas a Receber.
    await aplicarRecebimentoNoSaldo(
      base44,
      venda.id,
      valor,
      dataRecebimento,
      `Quitação de saldo (${numeroComplemento})`
    );

    // 3. Recalcula o saldo e o status da venda original a partir do valor recebido.
    const novoSaldo = arredondar(Math.max(0, saldoAtual - valor));
    const atualizacao = { pending_balance: novoSaldo };

    if (novoSaldo <= 0.005) {
      atualizacao.pending_balance = 0;
      atualizacao.status = 'pago';
      atualizacao.settled_date = dataRecebimento;
      atualizacao.pending_due_date = null;
    } else {
      atualizacao.status = 'parcial';
    }

    const vendaAtualizada = await base44.asServiceRole.entities.Sale.update(venda.id, atualizacao);

    return Response.json({
      complementary_sale: complemento,
      sale: vendaAtualizada,
      new_balance: novoSaldo,
      settled: novoSaldo <= 0.005,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}