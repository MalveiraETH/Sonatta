// Criação do contrato de uma venda a partir do modelo de documento
// "Contrato de Compromisso de Pagamento" (Configurações → Modelos), com as
// variáveis preenchidas pelos dados desta venda. Um contrato por venda: se já
// existir, ele é reaproveitado em vez de gerar duplicidade.
import { base44 } from '@/api/base44Client';
import { loadDocumentContext, fillDocumentVariables, stripUnresolvedVariables } from '@/lib/fillDocumentVariables';
import { money } from '@/lib/docVarsShared';

export const CONTRACT_TEMPLATE_NAME = 'Contrato de Compromisso de Pagamento';

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

// Busca o contrato já vinculado à venda (um contrato por venda).
export async function findContractBySale(saleId) {
  if (!saleId) return null;
  const res = await base44.entities.Contract.filter({ sale_id: saleId }, { limit: 1 });
  return (res.items || [])[0] || null;
}

// Devolve o contrato da venda, criando-o a partir do modelo quando ainda não existe.
export async function ensureContractForSale({ sale, user }) {
  if (!sale?.id) throw new Error('Venda não informada');

  const existing = await findContractBySale(sale.id);
  if (existing) return { contract: existing, created: false };

  const [templates, client] = await Promise.all([
    base44.entities.DocumentTemplate.filter({ name: CONTRACT_TEMPLATE_NAME }),
    sale.client_id
      ? base44.entities.Client.get(sale.client_id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const template = templates[0];
  if (!template) {
    throw new Error(`Modelo "${CONTRACT_TEMPLATE_NAME}" não encontrado em Configurações → Modelos`);
  }

  const contractNumber = generateContractNumber();
  // O contexto é montado com esta venda (e não com a última venda do cliente),
  // para o contrato refletir exatamente a venda que está sendo processada.
  const ctx = await loadDocumentContext({ client, user, sale });
  ctx.contract_number = contractNumber;

  const contractText = stripUnresolvedVariables(fillDocumentVariables(template.content || '', ctx));

  const contract = await base44.entities.Contract.create({
    contract_number: contractNumber,
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
    warranty_period: ctx.product_warranty || '12 meses',
    contract_text: contractText,
    status: 'gerado',
  });

  return { contract, created: true };
}