// Regras compartilhadas de quitação e estorno do saldo pendente de vendas parciais.

export const arredondar = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

export const hojeISO = () => new Date().toISOString().split('T')[0];

export const gerarNumeroVenda = (dataISO) => {
  const data = (dataISO || hojeISO()).replace(/-/g, '');
  const sufixo = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `VND-${data}-${sufixo}`;
};

/**
 * Aplica um recebimento nas parcelas de "saldo pendente" da venda (lançamento em Contas a Receber).
 * Baixa total ou parcial, sempre registrando o histórico do recebimento.
 */
export async function aplicarRecebimentoNoSaldo(base44, saleId, valor, dataPagamento, observacao) {
  const parcelas = await base44.asServiceRole.entities.Installment.filter({ sale_id: saleId });
  const pendentes = parcelas.filter(
    (p) => p.payment_method === 'saldo_pendente' && p.payment_status !== 'pago'
  );

  let restante = arredondar(valor);
  const baixadas = [];

  for (const parcela of pendentes) {
    if (restante <= 0) break;

    const saldoParcela = arredondar(parcela.remaining_amount ?? parcela.original_amount ?? 0);
    const aplicado = Math.min(restante, saldoParcela);
    const novoSaldo = arredondar(saldoParcela - aplicado);
    const novoPago = arredondar((parcela.paid_amount || 0) + aplicado);

    await base44.asServiceRole.entities.Installment.update(parcela.id, {
      paid_amount: novoPago,
      remaining_amount: novoSaldo,
      payment_status: novoSaldo <= 0.005 ? 'pago' : 'parcialmente_pago',
      last_payment_date: dataPagamento,
      payment_history: [
        ...(parcela.payment_history || []),
        { date: dataPagamento, amount: aplicado, note: observacao },
      ],
    });

    baixadas.push(parcela.id);
    restante = arredondar(restante - aplicado);
  }

  return baixadas;
}

/**
 * Devolve ao Contas a Receber o valor de um complemento estornado, reabrindo o saldo.
 */
export async function reabrirSaldoNoContasReceber(base44, saleId, valor, dataVencimento, observacao) {
  const parcelas = await base44.asServiceRole.entities.Installment.filter({ sale_id: saleId });
  const parcela = parcelas.find((p) => p.payment_method === 'saldo_pendente');
  if (!parcela) return null;

  const novoSaldo = arredondar((parcela.remaining_amount || 0) + valor);
  const novoPago = Math.max(0, arredondar((parcela.paid_amount || 0) - valor));

  await base44.asServiceRole.entities.Installment.update(parcela.id, {
    paid_amount: novoPago,
    remaining_amount: novoSaldo,
    payment_status: 'pendente',
    due_date: dataVencimento || parcela.due_date,
    payment_history: [
      ...(parcela.payment_history || []),
      { date: dataVencimento, amount: -valor, note: observacao },
    ],
  });

  return parcela.id;
}