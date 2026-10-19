// Criação do contrato de uma venda: apenas o registro (número, cliente, valor,
// condições de pagamento e garantia). O documento do contrato NÃO é gerado aqui:
// ele é produzido depois, na aba Documentos dos detalhes do cliente.
// Um contrato por venda: se já existir, ele é reaproveitado em vez de duplicar.
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/docVarsShared';

const METHOD_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX à vista',
  pix_parcelado: 'PIX parcelado',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};

export const generateContractNumber = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `CTR-${stamp}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

const paymentConditions = (sale) =>
  (sale.payment_details || [])
    .map((payment) => {
      const label = METHOD_LABELS[payment.method] || payment.method;
      const total = Number(payment.amount) || 0;
      const parts = Number(payment.installments) > 1
        ? `${payment.installments}x de ${money(total / payment.installments)}`
        : money(total);
      return `${label} – ${parts}`;
    })
    .filter(Boolean)
    .join(' + ');

// Garantia informativa do contrato: maior garantia entre os aparelhos da venda.
async function warrantyLabelOf(sale) {
  const ids = (sale.items || []).map((item) => item.product_id).filter(Boolean);
  if (!ids.length) return '12 meses';

  const res = await base44.entities.Product
    .filter({ id: { $in: ids } }, { limit: 50, fields: ['warranty_years'] })
    .catch(() => ({ items: [] }));

  const years = (res.items || [])
    .map((product) => Number(product.warranty_years))
    .filter((value) => value > 0);
  if (!years.length) return '12 meses';

  const max = Math.max(...years);
  return `${max} ${max === 1 ? 'ano' : 'anos'}`;
}

// Busca o contrato já vinculado à venda (um contrato por venda).
export async function findContractBySale(saleId) {
  if (!saleId) return null;
  const res = await base44.entities.Contract.filter({ sale_id: saleId }, { limit: 1 });
  return (res.items || [])[0] || null;
}

// Devolve o contrato da venda, registrando-o quando ainda não existe.
export async function ensureContractForSale({ sale }) {
  if (!sale?.id) throw new Error('Venda não informada');

  const existing = await findContractBySale(sale.id);
  if (existing) return { contract: existing, created: false };

  const client = sale.client_id
    ? await base44.entities.Client.get(sale.client_id).catch(() => null)
    : null;

  const contract = await base44.entities.Contract.create({
    contract_number: generateContractNumber(),
    sale_id: sale.id,
    client_id: sale.client_id,
    client_name: client?.full_name || sale.client_name || '',
    client_cpf: client?.cpf || sale.client_cpf || '',
    client_phone: client?.phone || sale.client_phone || '',
    client_email: client?.email || sale.client_email || '',
    client_address: client?.address || sale.client_address || '',
    products: (sale.items || []).map((item) => ({
      product_name: item.product_name,
      serial_number: item.serial_number || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    total_value: sale.total,
    payment_conditions: paymentConditions(sale),
    warranty_period: await warrantyLabelOf(sale),
    status: 'gerado',
  });

  return { contract, created: true };
}