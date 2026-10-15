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

// O editor grava os espaços como &nbsp;, então "{{&nbsp;cliente_nome&nbsp;}}"
// precisa ser lido como "{{ cliente_nome }}".
const decodeToken = (raw) =>
  String(raw || '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&');

// Ignora acentos, maiúsculas/minúsculas e espaços na comparação de nomes.
const normalizeToken = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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

// Títulos e siglas ignorados ao comparar nomes de profissionais.
const NAME_STOPWORDS = ['dr', 'dra', 'sr', 'sra', 'cc'];

const significantTokens = (name) =>
  normalizeToken(name)
    .split('_')
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.includes(token));

// O profissional responsável do cliente é gravado como ID em alguns registros e
// como nome em outros: os dois formatos são aceitos, com comparação tolerante.
function matchProfessional(list, value) {
  const raw = clean(value);
  if (!raw) return null;

  const byId = list.find((p) => p.id === raw);
  if (byId) return byId;

  const normalized = normalizeToken(raw);
  const byName = list.find((p) => normalizeToken(p.full_name) === normalized);
  if (byName) return byName;

  const tokens = significantTokens(raw);
  if (!tokens.length) return null;
  return (
    list.find((p) => {
      const own = significantTokens(p.full_name);
      return own.length > 0 && own.every((token) => tokens.includes(token));
    }) || null
  );
}

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
  }

  return ctx;
}

// Nomes alternativos aceitos pelos tokens. Vários modelos já salvos no sistema
// usam a nomenclatura em português (ex.: {{ paciente_nome_completo }}); aqui ela
// é ligada à variável oficial equivalente.
const ALIASES = {
  // Paciente / cliente
  paciente_nome_completo: 'client_name',
  paciente_nome: 'client_name',
  nome_paciente: 'client_name',
  nome_completo: 'client_name',
  nome_cliente: 'client_name',
  cliente_nome_completo: 'client_name',
  cliente_nome: 'client_name',
  paciente_cpf: 'client_cpf',
  cpf_paciente: 'client_cpf',
  cpf: 'client_cpf',
  paciente_telefone: 'client_phone',
  telefone_paciente: 'client_phone',
  telefone: 'client_phone',
  celular: 'client_phone',
  whatsapp: 'client_phone',
  paciente_email: 'client_email',
  email_paciente: 'client_email',
  email: 'client_email',
  paciente_data_nascimento: 'client_birth_date',
  data_nascimento: 'client_birth_date',
  paciente_endereco: 'client_address',
  endereco: 'client_address',
  endereco_completo: 'client_address',
  paciente_cep: 'client_cep',
  cep: 'client_cep',
  bairro: 'client_neighborhood',
  cidade: 'client_city',
  uf: 'client_state',
  estado: 'client_state',
  responsavel_nome: 'client_payer_name',
  nome_responsavel: 'client_payer_name',
  responsavel_pagamento: 'client_payer_name',
  responsavel_cpf: 'client_payer_document',
  cpf_responsavel: 'client_payer_document',
  responsavel_documento: 'client_payer_document',
  documento_responsavel: 'client_payer_document',
  uso_aparelhos: 'client_usage',
  uso: 'client_usage',
  indicado_por: 'client_referral',
  profissional_indicacao: 'client_referral',
  // Clínica / empresa
  clinica_nome: 'company_name',
  nome_clinica: 'company_name',
  empresa_nome: 'company_name',
  razao_social: 'company_name',
  clinica_cnpj: 'company_cnpj',
  cnpj: 'company_cnpj',
  empresa_cnpj: 'company_cnpj',
  clinica_endereco: 'company_address',
  endereco_clinica: 'company_address',
  empresa_endereco: 'company_address',
  clinica_telefone: 'contact_phone',
  telefone_clinica: 'contact_phone',
  empresa_telefone: 'contact_phone',
  clinica_email: 'company_email',
  email_clinica: 'company_email',
  empresa_email: 'company_email',
  // Profissional
  profissional_nome_completo: 'professional_name',
  profissional_nome: 'professional_name',
  nome_profissional: 'professional_name',
  profissional_especialidade: 'professional_specialty',
  especialidade: 'professional_specialty',
  profissional_conselho: 'professional_council',
  conselho: 'professional_council',
  crm: 'professional_council',
  crfa: 'professional_council',
  profissional_telefone: 'professional_phone',
  telefone_profissional: 'professional_phone',
  // Data & sistema
  data_atual: 'current_date',
  data_hoje: 'current_date',
  hoje: 'current_date',
  data_atual_extenso: 'current_date_long',
  data_extenso: 'current_date_long',
  data_por_extenso: 'current_date_long',
  hora_atual: 'current_time',
  hora: 'current_time',
  usuario_nome: 'user_name',
  nome_usuario: 'user_name',
  usuario_papel: 'user_role',
  papel_usuario: 'user_role',
};

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