// Preenchimento das variáveis dinâmicas dos modelos de documento com os dados
// do paciente, da clínica, do profissional responsável e do usuário logado.
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLE_LABELS = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção',
};

const SPECIALTY_LABELS = {
  pediatra: 'Pediatra',
  neuropediatra: 'Neuropediatra',
  otorrinolaringologista: 'Otorrinolaringologista',
  otologista: 'Otologista',
  fonoaudiologo: 'Fonoaudiólogo(a)',
};

const clean = (value) => (value == null ? '' : String(value).trim());

const formatDate = (raw) => {
  if (!raw) return '';
  try {
    const s = String(raw);
    const d = s.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(d.getTime())) return '';
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '';
  }
};

function buildClientAddress(client) {
  const parts = [
    clean(client.address),
    clean(client.address_number) && `Nº ${client.address_number}`,
    clean(client.address_neighborhood),
    clean(client.address_city) &&
      `${client.address_city}${client.address_state ? ` - ${client.address_state}` : ''}`,
    clean(client.address_cep) && `CEP ${client.address_cep}`,
  ].filter(Boolean);
  return parts.join(', ');
}

// Monta o mapa de variáveis resolvíveis. A clínica e o profissional são
// buscados em modo "melhor esforço": se não estiverem acessíveis, os tokens
// permanecem no texto para o usuário completar.
export async function loadDocumentContext({ client, user }) {
  const ctx = {};
  const now = new Date();

  ctx.current_date = format(now, 'dd/MM/yyyy');
  ctx.current_date_long = format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  ctx.current_time = format(now, 'HH:mm');
  if (user) {
    ctx.user_name = clean(user.full_name);
    ctx.user_role = ROLE_LABELS[user.role] || clean(user.role);
  }

  if (client) {
    ctx.client_name = clean(client.full_name);
    ctx.client_cpf = clean(client.cpf);
    ctx.client_phone = clean(client.phone);
    ctx.client_email = clean(client.email);
    ctx.client_birth_date = formatDate(client.birth_date);
    ctx.client_address = buildClientAddress(client);
    ctx.client_cep = clean(client.address_cep);
    ctx.client_neighborhood = clean(client.address_neighborhood);
    ctx.client_city = clean(client.address_city);
    ctx.client_state = clean(client.address_state);
    ctx.client_payer_name = clean(client.payer_name);
    ctx.client_payer_document = clean(client.payer_document);
    ctx.client_usage =
      client.uso_aparelhos === 'bilateral'
        ? 'Bilateral'
        : client.uso_aparelhos === 'unilateral'
          ? 'Unilateral'
          : '';
    ctx.client_referral = clean(client.referral_professional);
  }

  try {
    const companyRes = await base44.entities.Company.filter({}, { limit: 1 });
    const company = (companyRes.items || [])[0];
    if (company) {
      ctx.company_name = clean(company.name);
      ctx.company_cnpj = clean(company.cnpj);
      ctx.company_address = clean(company.address);
      ctx.contact_phone = clean(company.phone);
      ctx.company_email = clean(company.email);
    }
  } catch {
    /* sem acesso aos dados da clínica */
  }

  const responsible = clean(client?.responsible_professional);
  if (responsible) {
    try {
      const profRes = await base44.entities.Professional.filter(
        { full_name: responsible },
        { limit: 1 }
      );
      const prof = (profRes.items || [])[0];
      ctx.professional_name = prof ? clean(prof.full_name) : responsible;
      if (prof) {
        ctx.professional_specialty = SPECIALTY_LABELS[prof.specialty] || clean(prof.specialty);
        ctx.professional_council = clean(prof.council_number);
        ctx.professional_phone = clean(prof.whatsapp);
      }
    } catch {
      ctx.professional_name = responsible;
    }
  }

  return ctx;
}

// Substitui os tokens {{ nome }} pelos valores disponíveis. Tokens sem valor
// ficam intactos para não apagar informação do modelo.
export function fillDocumentVariables(html, ctx) {
  if (!html) return '';
  let out = String(html);
  Object.entries(ctx || {}).forEach(([token, value]) => {
    if (value == null || value === '') return;
    const pattern = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, 'g');
    out = out.replace(pattern, String(value));
  });
  return out;
}