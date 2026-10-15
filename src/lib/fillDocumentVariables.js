// Preenchimento das variáveis dinâmicas dos modelos de documento com os dados
// do paciente, da clínica, do profissional responsável e do usuário logado,
// somados ao contexto comercial (venda, produtos, pagamentos, orçamento,
// contrato, locação, atendimento e teste) do módulo documentBusinessContext.
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ALIASES } from '@/lib/documentVariableAliases';
import { buildBusinessContext } from '@/lib/documentBusinessContext';
import {
  CLIENT_STATUS_LABELS,
  ROLE_LABELS,
  SPECIALTY_LABELS,
  ageFrom,
  clean,
  decodeToken,
  formatDate,
  labelOf,
  matchProfessional,
  normalizeToken,
} from '@/lib/docVarsShared';

const buildClientAddress = (client) =>
  [
    clean(client.address),
    clean(client.address_number) && `Nº ${client.address_number}`,
    clean(client.address_neighborhood),
    clean(client.address_city) &&
      `${client.address_city}${client.address_state ? ` - ${client.address_state}` : ''}`,
    clean(client.address_cep) && `CEP ${client.address_cep}`,
  ]
    .filter(Boolean)
    .join(', ');

// Profissional que atendeu o cliente: o responsável cadastrado ou, na falta
// dele, o profissional do último atendimento/teste registrado.
async function findAttendingName(client) {
  const apptRes = await base44.entities.Appointment.filter(
    { client_id: client.id },
    { limit: 1, sort: '-date' }
  );
  const fromAppointment = clean((apptRes.items || [])[0]?.professional_name);
  if (fromAppointment) return fromAppointment;

  const testRes = await base44.entities.Test.filter(
    { client_id: client.id },
    { limit: 1, sort: '-created_date' }
  );
  return clean((testRes.items || [])[0]?.professional_name);
}

// Monta o mapa de variáveis resolvíveis. A clínica, o profissional e os dados
// comerciais são buscados em modo "melhor esforço": se não existirem, os tokens
// permanecem no texto para o usuário completar.
export async function loadDocumentContext({ client, user }) {
  const ctx = {};
  const now = new Date();

  ctx.current_date = format(now, 'dd/MM/yyyy');
  ctx.current_date_long = format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  ctx.current_time = format(now, 'HH:mm');
  ctx.current_year = format(now, 'yyyy');
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
    ctx.client_age = ageFrom(client.birth_date);
    ctx.client_address = buildClientAddress(client);
    ctx.client_street = clean(client.address);
    ctx.client_address_number = clean(client.address_number);
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
    ctx.client_responsible_professional = clean(client.responsible_professional);
    ctx.client_status = labelOf(CLIENT_STATUS_LABELS, client.status);
    ctx.client_notes = clean(client.notes);
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

  if (client) {
    try {
      const profRes = await base44.entities.Professional.filter(
        {},
        { limit: 200, sort: 'full_name' }
      );
      const professionals = profRes.items || [];

      const rawResponsible = clean(client.responsible_professional);
      let professional = matchProfessional(professionals, rawResponsible);
      // Um ID sem correspondência não deve virar o nome do profissional.
      let name =
        clean(professional?.full_name) ||
        (/^[a-f0-9]{24}$/i.test(rawResponsible) ? '' : rawResponsible);

      if (!name) {
        name = await findAttendingName(client);
        if (name) professional = matchProfessional(professionals, name);
      }

      if (name) {
        ctx.professional_name = clean(professional?.full_name) || name;
        if (professional) {
          ctx.professional_specialty =
            SPECIALTY_LABELS[professional.specialty] || clean(professional.specialty);
          ctx.professional_council = clean(professional.council_number);
          ctx.professional_phone = clean(professional.whatsapp);
        }
      }
    } catch {
      /* dados do profissional indisponíveis */
    }

    Object.assign(ctx, await buildBusinessContext(client));
  }

  return ctx;
}

function buildTokenLookup(ctx) {
  const map = new Map();
  const add = (token, value) => {
    const key = normalizeToken(token);
    if (key && value != null && value !== '') map.set(key, String(value));
  };
  Object.entries(ctx || {}).forEach(([token, value]) => add(token, value));
  Object.entries(ALIASES).forEach(([alias, token]) => add(alias, ctx?.[token]));
  return map;
}

// Substitui os tokens {{ nome }} pelos valores disponíveis. Tokens sem valor
// ficam intactos para o usuário completar no editor.
export function fillDocumentVariables(html, ctx) {
  if (!html) return '';
  const lookup = buildTokenLookup(ctx);
  if (!lookup.size) return String(html);
  return String(html).replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, token) => {
    const value = lookup.get(normalizeToken(decodeToken(token)));
    return value == null ? match : value;
  });
}

// Remove os tokens que continuaram sem valor (usado no PDF final, para o
// documento não sair impresso com {{ variavel }}).
export function stripUnresolvedVariables(html) {
  if (!html) return '';
  return String(html)
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:])/g, '$1');
}