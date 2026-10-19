// Resolve os profissionais de uma venda (indicação e responsável).
// Fontes, em ordem: dados gravados na própria venda, teste mais recente do
// cliente, agendamento mais recente e, por último, o cadastro do cliente.

const ID_PATTERN = /^[a-f0-9]{24}$/i;

const recordDate = (record) =>
  new Date(record?.start_date || record?.date || record?.created_date || 0).getTime();

// Registro mais recente do cliente (teste, agendamento, etc.)
export const findLatestByClient = (records = [], clientId) => {
  if (!clientId) return null;
  return records
    .filter((r) => r.client_id === clientId)
    .sort((a, b) => recordDate(b) - recordDate(a))[0] || null;
};

const nameById = (professionals, id) => {
  if (!id) return '';
  return professionals.find((p) => p.id === id)?.full_name || '';
};

// O cadastro do cliente pode guardar o ID ou o próprio nome
const nameFromClientField = (professionals, value) => {
  if (!value) return '';
  return ID_PATTERN.test(value) ? nameById(professionals, value) : value;
};

/**
 * @returns {{ referralName: string, responsibleName: string }}
 * Nomes vazios quando não há informação de profissional disponível.
 */
export function resolveSaleProfessionals(sale, { tests = [], appointments = [], professionals = [], client = null } = {}) {
  if (!sale) return { referralName: '', responsibleName: '' };

  const latestTest = findLatestByClient(tests, sale.client_id);
  const latestAppointment = findLatestByClient(appointments, sale.client_id);

  const referralName =
    nameById(professionals, sale.test_referral_id) ||
    sale.test_referral_name ||
    nameById(professionals, latestTest?.referral_professional_id) ||
    latestTest?.referral_professional_name ||
    nameById(professionals, latestAppointment?.test_referral_id) ||
    latestAppointment?.test_referral_name ||
    nameFromClientField(professionals, client?.referral_professional) ||
    '';

  const responsibleName =
    latestTest?.professional_name ||
    nameById(professionals, latestTest?.professional_id) ||
    latestAppointment?.professional_name ||
    nameById(professionals, latestAppointment?.professional_id) ||
    nameById(professionals, sale.seller_id) ||
    nameFromClientField(professionals, client?.responsible_professional) ||
    sale.seller_name ||
    '';

  return { referralName, responsibleName };
}