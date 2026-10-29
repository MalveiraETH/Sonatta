// Estrutura do orçamento: modelo de documento (Configurações > Modelos) e blocos
// de garantia / bloco de cuidado personalizados por nível de categoria do produto.
import { base44 } from '@/api/base44Client';
import {
  QUOTE_STATUS_LABELS,
  clean,
  formatDate,
  money,
  validityUntil,
} from '@/lib/docVarsShared';

export const BLOCKS_SETTING_KEY = 'quote_category_blocks';
export const DEFAULT_CATEGORY = 'padrao';
export const QUOTE_TEMPLATE_CATEGORY = 'orcamento';

// Níveis de tecnologia (Produtos de Referência) disponíveis para personalizar os blocos
export const MARKUP_CATEGORIES = ['90', '70', '50', '30', '10', '5'];

export const BLOCK_CATEGORY_LABELS = {
  [DEFAULT_CATEGORY]: 'Padrão (demais níveis)',
  ...MARKUP_CATEGORIES.reduce((acc, key) => ({ ...acc, [key]: `Nível ${key}` }), {}),
};

export const CATEGORY_OPTIONS = [DEFAULT_CATEGORY, ...MARKUP_CATEGORIES].map((key) => ({
  key,
  label: BLOCK_CATEGORY_LABELS[key],
}));

const DEFAULT_WARRANTY =
  '<h3><strong>Garantia de Fábrica</strong></h3><p>Cobre defeitos de fabricação conforme padrão do fabricante (reparos ou substituição de componentes com falhas de origem fabril, mediante uso conforme normas técnicas).</p><h3><strong>Garantia de Adaptação</strong></h3><p>Acompanhamento técnico inicial para ajustes finos e suporte à adaptação, assegurando o ganho auditivo conforme as necessidades clínicas do paciente.</p>';

const DEFAULT_FOLLOWUP =
  '<p>Todas as revisões abaixo são <strong>TOTALMENTE GRATUITAS</strong> para clientes Sonatta:</p><ul><li>1ª Revisão — 3 meses após a compra</li><li>2ª Revisão — 9 meses após a compra</li><li>Revisões Subsequentes — A cada 12 meses (anualmente)</li></ul><p>Caso detecte qualquer dificuldade fora dos períodos programados, o cliente pode agendar consulta extra — também coberta pelo atendimento Sonatta.</p>';

const hasText = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .trim().length > 0;

export const DEFAULT_BLOCKS = {
  [DEFAULT_CATEGORY]: { warranty_text: DEFAULT_WARRANTY, followup_text: DEFAULT_FOLLOWUP },
};

// Conteúdo usado quando ainda não existe um modelo de orçamento cadastrado
export const DEFAULT_CONTENT_HTML = `<h2>Apresentação</h2>
<p>Prezado(a) {{ client_name }}, apresentamos abaixo a proposta comercial elaborada pela Sonatta Soluções Auditivas, com as condições de investimento e o acompanhamento incluído no atendimento.</p>
{{ dados_cliente }}
{{ tabela_itens }}
{{ resumo_financeiro }}
{{ garantias }}
<h3>Validade e observações</h3>
<p>Esta proposta é válida até {{ quote_valid_until }}.</p>
<p>{{ quote_notes }}</p>`;

// Blocos automáticos do orçamento (inseridos no modelo como variáveis)
export const QUOTE_BLOCK_TOKENS = [
  'dados_cliente',
  'tabela_itens',
  'resumo_financeiro',
  'garantias',
];

const BLOCK_RE =
  /\{\{\s*(?:&nbsp;)?\s*(dados_cliente|tabela_itens|resumo_financeiro|garantias|acompanhamento)\s*(?:&nbsp;)?\s*\}\}/gi;

// Divide o modelo em trechos de texto e blocos automáticos, na ordem do documento
export function splitQuoteContent(html) {
  const source = String(html || '');
  const parts = [];
  let last = 0;

  source.replace(BLOCK_RE, (match, name, index) => {
    if (index > last) parts.push({ html: source.slice(last, index) });
    parts.push({ block: name.toLowerCase() });
    last = index + match.length;
    return match;
  });

  if (last < source.length) parts.push({ html: source.slice(last) });
  return parts;
}

// Variáveis do orçamento gerado (sobrescrevem o contexto comercial do cliente)
export function buildQuoteVariables(quote) {
  const items = quote.items || [];
  const validityDays = Number(quote.validity_days) || 30;

  return {
    quote_number: clean(quote.quote_number),
    quote_date: formatDate(quote.created_date),
    quote_subtotal: money(quote.subtotal),
    quote_discount: money(quote.discount),
    quote_total: money(quote.total),
    quote_status: QUOTE_STATUS_LABELS[quote.status] || clean(quote.status),
    quote_validity_days: String(validityDays),
    quote_valid_until: validityUntil(quote.created_date, validityDays),
    quote_notes: clean(quote.notes),
    quote_items: items
      .map((item) => `${item.quantity || 1}x ${clean(item.product_name)}`)
      .join('; '),
    quote_items_count: String(items.length),
  };
}

// Modelo de orçamento ativo (o primeiro cadastrado em Configurações > Modelos)
export async function loadQuoteTemplate() {
  try {
    const res = await base44.entities.DocumentTemplate.filter(
      { category: QUOTE_TEMPLATE_CATEGORY },
      { sort: 'name', limit: 20 }
    );
    const items = res.items || [];
    return items.find((t) => t.is_active !== false) || items[0] || null;
  } catch {
    return null;
  }
}

// Blocos de garantia e acompanhamento por categoria
export async function loadQuoteBlocks() {
  try {
    const all = await base44.entities.AppSettings.list();
    const rec = all.find((r) => r.setting_key === BLOCKS_SETTING_KEY);
    if (rec && rec.setting_value) return { ...DEFAULT_BLOCKS, ...rec.setting_value };
  } catch {
    /* usa os blocos padrão */
  }
  return DEFAULT_BLOCKS;
}

export async function saveQuoteBlocks(blocks) {
  const all = await base44.entities.AppSettings.list();
  const existing = all.find((r) => r.setting_key === BLOCKS_SETTING_KEY);
  if (existing) {
    await base44.entities.AppSettings.update(existing.id, { setting_value: blocks });
    return existing.id;
  }
  const created = await base44.entities.AppSettings.create({
    setting_key: BLOCKS_SETTING_KEY,
    description: 'Garantia e acompanhamento vitalício por categoria do orçamento',
    setting_value: blocks,
  });
  return created.id;
}

// Níveis de tecnologia dos itens do orçamento (os mesmos de
// Configurações > Produtos de Referência: 90, 70, 50, 30, 10, 5).
// O item do orçamento pode apontar para um Produto de Referência (caso normal)
// ou para um aparelho do estoque — os dois caminhos são considerados.
// Retorna o nível de cada item e a lista de níveis do orçamento (maior primeiro).
export async function resolveQuoteLevels(quote) {
  const items = quote.items || [];
  if (!items.length) return { items: [], categories: [] };

  const ids = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
  const names = [...new Set(items.map((item) => clean(item.product_name)).filter(Boolean))];

  const first = (res) => (res?.items || res || [])[0] || null;

  const [refsById, productsById, refsByName, productsByName] = await Promise.all([
    Promise.all(ids.map((id) => base44.entities.ReferenceProduct.get(id).catch(() => null))),
    Promise.all(ids.map((id) => base44.entities.Product.get(id).catch(() => null))),
    Promise.all(
      names.map((name) =>
        base44.entities.ReferenceProduct.filter({ name }, { limit: 5 }).then(first).catch(() => null)
      )
    ),
    Promise.all(
      names.map((name) =>
        base44.entities.Product.filter({ name }, { limit: 5 })
          .then((res) => (res?.items || res || []).find((p) => p.markup_category || p.reference) || null)
          .catch(() => null)
      )
    ),
  ]);

  const refById = {};
  const productById = {};
  const refByName = {};
  const productByName = {};
  ids.forEach((id, i) => { refById[id] = refsById[i]; productById[id] = productsById[i]; });
  names.forEach((name, i) => { refByName[name] = refsByName[i]; productByName[name] = productsByName[i]; });

  // Aparelho do estoque sem categoria própria herda o nível da referência
  const codes = new Set();
  const collectCode = (product) => {
    if (product && !product.markup_category && product.reference) codes.add(product.reference);
  };
  Object.values(productById).forEach(collectCode);
  Object.values(productByName).forEach(collectCode);

  const refCategoryByCode = {};
  if (codes.size) {
    const res = await base44.entities.ReferenceProduct
      .filter({ reference: { $in: [...codes] } })
      .catch(() => null);
    (res?.items || res || []).forEach((ref) => {
      if (ref.category) refCategoryByCode[ref.reference] = ref.category;
    });
  }

  const itemsWithLevel = items.map((item) => {
    const name = clean(item.product_name);
    const ref = (item.product_id && refById[item.product_id]) || refByName[name] || null;
    const product = (item.product_id && productById[item.product_id]) || productByName[name] || null;
    const level =
      String(ref?.category || '') ||
      String(product?.markup_category || '') ||
      String((product?.reference && refCategoryByCode[product.reference]) || '');
    return { item, level };
  });

  const categories = [...new Set(itemsWithLevel.map((row) => row.level).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  return { items: itemsWithLevel, categories };
}

// Indica se a categoria tem texto próprio cadastrado (senão usa o Padrão)
export function hasCustomBlockText(blocks, category) {
  return hasText(blocks?.[category]?.warranty_text);
}

// Blocos aplicáveis ao orçamento: usa a categoria do produto e, quando ela não
// tem texto próprio, o bloco padrão.
export function resolveCategoryBlocks(blocks, categories) {
  const list = categories.length ? categories : [DEFAULT_CATEGORY];
  return list
    .map((category) => {
      const own = blocks?.[category];
      const config = own && (own.warranty_text || own.followup_text)
        ? own
        : blocks?.[DEFAULT_CATEGORY];
      if (!config) return null;
      return {
        category,
        label: BLOCK_CATEGORY_LABELS[category] || '',
        // Categoria sem texto próprio usa a garantia padrão Sonatta, para o
        // bloco nunca sair vazio no PDF
        warranty_text: hasText(config.warranty_text) ? config.warranty_text : DEFAULT_WARRANTY,
        followup_text: config.followup_text || '',
      };
    })
    .filter(Boolean);
}