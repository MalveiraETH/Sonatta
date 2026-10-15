// Helpers e rótulos compartilhados pelas variáveis dinâmicas dos documentos.
// Usado pelo preenchimento dos modelos (fillDocumentVariables), pelo contexto
// comercial (documentBusinessContext) e pelo catálogo exibido na interface.
import { format, addYears, addDays, differenceInYears } from 'date-fns';
import { formatBRL } from '@/lib/masks';

export const clean = (value) => (value == null ? '' : String(value).trim());

// O editor grava os espaços como &nbsp;, então "{{&nbsp;cliente_nome&nbsp;}}"
// precisa ser lido como "{{ cliente_nome }}".
export const decodeToken = (raw) =>
  String(raw || '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/gi, '&');

// Ignora acentos, maiúsculas/minúsculas e espaços na comparação de tokens.
export const normalizeToken = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const formatDate = (raw) => {
  if (!raw) return '';
  try {
    let date;
    if (raw instanceof Date) {
      date = raw;
    } else {
      const s = String(raw);
      date = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
    }
    if (isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '';
  }
};

const toDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw);
  const match = s.match(/^\d{4}-\d{2}-\d{2}/);
  const date = match ? new Date(`${match[0]}T12:00:00`) : new Date(s);
  return isNaN(date.getTime()) ? null : date;
};

// Idade do paciente em anos ("42 anos").
export const ageFrom = (birthDate) => {
  const date = toDate(birthDate);
  if (!date) return '';
  const years = differenceInYears(new Date(), date);
  return years > 0 && years < 130 ? `${years} anos` : '';
};

// Fim da garantia a partir da data da venda e dos anos de garantia.
export const warrantyUntil = (baseDate, years) => {
  const date = toDate(baseDate);
  const total = Number(years);
  if (!date || !total) return '';
  return formatDate(addYears(date, total));
};

export const warrantyLabel = (years) => {
  const total = Number(years);
  if (!total) return '';
  return total === 1 ? '1 ano' : `${total} anos`;
};

// Validade do orçamento (data de criação + dias de validade).
export const validityUntil = (createdDate, days) => {
  const date = toDate(createdDate);
  const total = Number(days);
  if (!date || !total) return '';
  return formatDate(addDays(date, total));
};

export const money = (value) => {
  if (value == null || value === '' || isNaN(Number(value))) return '';
  return `R$ ${formatBRL(value)}`;
};

export const countText = (value) => {
  if (value == null || value === '' || isNaN(Number(value))) return '';
  return String(Number(value));
};

export const percent = (value) => {
  if (value == null || value === '' || isNaN(Number(value))) return '';
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
};

export const joinList = (items, separator = '; ') =>
  (items || []).map(clean).filter(Boolean).join(separator);

// ── Rótulos das opções gravadas nas entidades ──
export const ROLE_LABELS = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção',
};

export const SPECIALTY_LABELS = {
  pediatra: 'Pediatra',
  neuropediatra: 'Neuropediatra',
  otorrinolaringologista: 'Otorrinolaringologista',
  otologista: 'Otologista',
  fonoaudiologo: 'Fonoaudiólogo(a)',
};

export const CLIENT_STATUS_LABELS = {
  lead: 'Lead',
  cliente_ativo: 'Cliente ativo',
  pos_venda: 'Pós-venda',
};

export const PRODUCT_CATEGORY_LABELS = {
  aparelho_auditivo: 'Aparelho auditivo',
  bateria: 'Bateria',
  carregador: 'Carregador',
  cerustop: 'Cerustop',
  desumidificador: 'Desumidificador',
  gancho: 'Gancho',
  gaveta: 'Gaveta',
  microfone: 'Microfone',
  molde: 'Molde',
  oliva: 'Oliva',
  outros: 'Outros',
  receptor: 'Receptor',
  tubo_molde: 'Tubo/Molde',
};

export const SALE_STATUS_LABELS = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  parcial: 'Parcial',
};

export const QUOTE_STATUS_LABELS = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  convertido: 'Convertido',
};

export const CONTRACT_STATUS_LABELS = {
  gerado: 'Gerado',
  enviado: 'Enviado',
  assinado: 'Assinado',
  arquivado: 'Arquivado',
};

export const RECORD_TYPE_LABELS = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  avaliacao: 'Avaliação',
  ajuste: 'Ajuste',
  exame: 'Exame',
  outros: 'Outros',
};

export const TEST_STATUS_LABELS = {
  teste_agendado: 'Teste agendado',
  em_teste: 'Em teste',
  teste_estendido: 'Teste estendido',
  teste_finalizado: 'Teste finalizado',
  teste_pendente: 'Teste pendente',
};

export const RENTAL_TERM_LABELS = {
  determinado: 'Prazo determinado',
  indeterminado: 'Prazo indeterminado',
};

export const RENTAL_STATUS_LABELS = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

// Rótulo legível para um valor de enum; quando não há rótulo, humaniza o valor.
export const labelOf = (labels, value) => {
  const raw = clean(value);
  if (!raw) return '';
  if (labels && labels[raw]) return labels[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ');
};

// ── Comparação tolerante de nomes de profissionais ──
const NAME_STOPWORDS = ['dr', 'dra', 'sr', 'sra', 'cc'];

const significantTokens = (name) =>
  normalizeToken(name)
    .split('_')
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.includes(token));

// O profissional responsável do cliente é gravado como ID em alguns registros e
// como nome em outros: os dois formatos são aceitos, com comparação tolerante.
export function matchProfessional(list, value) {
  const raw = clean(value);
  if (!raw) return null;

  const byId = (list || []).find((p) => p.id === raw);
  if (byId) return byId;

  const normalized = normalizeToken(raw);
  const byName = (list || []).find((p) => normalizeToken(p.full_name) === normalized);
  if (byName) return byName;

  const tokens = significantTokens(raw);
  if (!tokens.length) return null;
  return (
    (list || []).find((p) => {
      const own = significantTokens(p.full_name);
      return own.length > 0 && own.every((token) => tokens.includes(token));
    }) || null
  );
}