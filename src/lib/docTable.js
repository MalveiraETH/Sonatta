// Utilitários da tabela inserida nos modelos de documento.
// A tabela é guardada como bloco atômico no conteúdo (atributo data-rows em JSON)
// e renderizada como HTML para exibição no documento.

export const MAX_TABLE_ROWS = 20;
export const MAX_TABLE_COLS = 8;

const TABLE_STYLE = 'border-collapse:collapse;width:100%;';
const CELL_STYLE = 'border:1px solid #cbd5e1;padding:6px 8px;font-size:14px;min-width:70px;vertical-align:top;';
const HEAD_STYLE = `${CELL_STYLE}background:#F1ECFA;font-weight:600;text-align:left;`;

export function emptyTable(rows = 3, cols = 3) {
  return {
    header: true,
    rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')),
  };
}

export function parseTableValue(value) {
  let data = value;
  if (typeof value === 'string') {
    if (!value) return emptyTable();
    try {
      data = JSON.parse(value);
    } catch (e) {
      return emptyTable();
    }
  }
  if (!data || !Array.isArray(data.rows) || !data.rows.length) return emptyTable();

  const cols = Math.max(1, ...data.rows.map((row) => (Array.isArray(row) ? row.length : 0)));
  const rows = data.rows.map((row) => {
    const cells = Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : [];
    while (cells.length < cols) cells.push('');
    return cells;
  });

  return { header: data.header !== false, rows };
}

export function serializeTable(data) {
  return JSON.stringify({ header: data.header !== false, rows: data.rows });
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function renderTableHtml(data) {
  const { rows, header } = data;
  const headRows = header ? rows.slice(0, 1) : [];
  const bodyRows = header ? rows.slice(1) : rows;

  const cell = (value, style, tag) =>
    `<${tag} style="${style}">${value ? escapeHtml(value) : '&nbsp;'}</${tag}>`;

  const head = headRows.length
    ? `<thead>${headRows
        .map((row) => `<tr>${row.map((value) => cell(value, HEAD_STYLE, 'th')).join('')}</tr>`)
        .join('')}</thead>`
    : '';

  const body = bodyRows.length
    ? `<tbody>${bodyRows
        .map((row) => `<tr>${row.map((value) => cell(value, CELL_STYLE, 'td')).join('')}</tr>`)
        .join('')}</tbody>`
    : '';

  return `<table style="${TABLE_STYLE}">${head}${body}</table>`;
}