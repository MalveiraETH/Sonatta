import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const pad = (value) => String(value).padStart(2, '0');

const parseDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

// Soma meses preservando o dia, ajustando para o último dia do mês quando necessário.
const addMonths = (isoDate, months) => {
  const parsed = parseDate(isoDate);
  if (!parsed) return '';
  const total = parsed.year * 12 + (parsed.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(parsed.day, lastDay))}`;
};

const addYears = (isoDate, years) => addMonths(isoDate, Math.round((Number(years) || 0) * 12));

// Mesmo número da venda, apenas com o prefixo trocado (VND-... -> CRT-...).
const certificateNumberFor = (saleNumber, saleId) => {
  const raw = String(saleNumber || '').trim();
  if (!raw) return `CRT-${String(saleId || '').slice(-6)}`;
  if (/^[A-Za-z]+/.test(raw)) return raw.replace(/^[A-Za-z]+/, 'CRT');
  return `CRT-${raw}`;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const saleId = String(body.sale_id || body.saleId || '').trim();
    if (!saleId) return Response.json({ error: 'sale_id é obrigatório' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.Sale.get(saleId);
    if (!sale) return Response.json({ error: 'Venda não encontrada' }, { status: 404 });

    // Um certificado por venda: reprocessar devolve o certificado já existente.
    const existing = await base44.asServiceRole.entities.WarrantyCertificate.filter(
      { sale_id: saleId },
      { limit: 1 }
    );
    const already = (existing.items || [])[0];
    if (already) {
      return Response.json({ success: true, already_exists: true, certificate: already });
    }

    const saleDate = String(sale.sale_date || sale.created_date || '').slice(0, 10);
    const items = Array.isArray(sale.items) ? sale.items : [];
    const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];

    const productRes = productIds.length
      ? await base44.asServiceRole.entities.Product.filter(
          { id: { $in: productIds } },
          { limit: 200 }
        )
      : { items: [] };
    const productsById = new Map((productRes.items || []).map((product) => [product.id, product]));

    const certItems = [];
    for (const item of items) {
      const product = productsById.get(item.product_id) || {};
      const serial = String(item.serial_number || product.serial_number || '').trim();
      const warrantyYears = Number(product.warranty_years) || 0;
      if (!serial && !warrantyYears) continue;
      const years = warrantyYears || 2;
      certItems.push({
        product_id: item.product_id || '',
        product_name: item.product_name || product.name || '',
        brand: product.brand || '',
        model: product.model || '',
        serial_number: serial,
        warranty_years: years,
        warranty_start: saleDate,
        warranty_end: addYears(saleDate, years),
      });
    }

    if (!certItems.length) {
      return Response.json({
        success: false,
        skipped: true,
        reason: 'Venda sem aparelhos com garantia',
      });
    }

    const warrantyEnd =
      certItems
        .map((item) => item.warranty_end)
        .filter(Boolean)
        .sort()
        .pop() || '';

    const certificate = await base44.asServiceRole.entities.WarrantyCertificate.create({
      certificate_number: certificateNumberFor(sale.sale_number, sale.id),
      sale_id: sale.id,
      sale_number: sale.sale_number || '',
      sale_date: saleDate,
      client_id: sale.client_id || '',
      client_name: sale.client_name || '',
      client_cpf: sale.client_cpf || '',
      warranty_start: saleDate,
      warranty_end: warrantyEnd,
      review_1_date: addMonths(saleDate, 3),
      review_2_date: addMonths(saleDate, 9),
      items: certItems,
      generated_at: new Date().toISOString(),
    });

    return Response.json({ success: true, certificate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}