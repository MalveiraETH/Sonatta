import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const normalize = (value) =>
  (value || '')
    .toString()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

const toReference = (reference) => ({
  reference: reference.reference || '',
  name: reference.name || '',
  brand: reference.brand || '',
  category: reference.category || '',
  cost: Number(reference.cost || 0),
  include_fixed_cost: reference.include_fixed_cost !== false,
  warranty_years: reference.warranty_years ?? 2,
  power_type: reference.power_type || 'bateria_recarregavel',
});

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const imageUris = Array.isArray(body.image_uris)
      ? body.image_uris.filter((uri) => typeof uri === 'string' && uri.trim())
      : [];
    if (!imageUris.length) {
      return Response.json({ error: 'Envie ao menos uma imagem' }, { status: 400 });
    }
    if (imageUris.length > 8) {
      return Response.json({ error: 'Máximo de 8 imagens por análise' }, { status: 400 });
    }

    const references = await base44.asServiceRole.entities.ReferenceProduct.list();
    const catalog = references
      .map(
        (reference) =>
          `${reference.reference} | ${reference.name} | ${reference.brand || '-'} | Nível ${
            reference.category || '-'
          }`
      )
      .join('\n');

    const prompt = `Você é um assistente de estoque de uma empresa de soluções auditivas. Analise as fotos de caixas de aparelhos auditivos e acessórios e extraia os dados de CADA unidade visível.

Regras:
- Uma caixa corresponde a um produto. Se houver várias caixas iguais, liste cada uma separadamente, com o número de série próprio de cada uma.
- Leia o número de série impresso na etiqueta (campos como "S/N", "Serial", "NS", "Nº de série", "Serial No."). Devolva exatamente como impresso, sem espaços.
- Leia a referência do produto (campos como "REF", "Reference", "Modelo", "Model", "Art.-Nr.", "Order No.").
- Leia o código de barras (1D) e o QR Code quando estiverem legíveis e copie o conteúdo completo em barcode e qr_code. Se o conteúdo do código for a própria série ou a referência, mantenha o valor no campo do código e replique no campo correspondente.
- Se um campo não estiver legível, devolva string vazia. Nunca invente valores.
- product_name: nome comercial do aparelho, por exemplo "Phonak Audéo Lumity L90-R".
- brand: marca (Phonak, Argosy, Starkey, Widex, Resound, etc.).

Catálogo de produtos de referência da empresa (referência | nome | marca | nível):
${catalog || '(catálogo vazio)'}

Use o catálogo para completar nome e marca quando a referência lida coincidir.`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: imageUris,
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                reference: { type: 'string' },
                serial_number: { type: 'string' },
                brand: { type: 'string' },
                model: { type: 'string' },
                barcode: { type: 'string' },
                qr_code: { type: 'string' },
              },
              required: ['product_name', 'reference', 'serial_number'],
            },
          },
        },
        required: ['products'],
      },
    });

    const extracted = Array.isArray(response?.products)
      ? response.products
      : Array.isArray(response)
        ? response
        : [];

    const byKey = new Map();
    references.forEach((reference) => {
      const key = normalize(reference.reference);
      if (key) byKey.set(key, reference);
    });

    const findReference = (keys) => {
      for (const key of keys) {
        if (key && byKey.has(key)) return byKey.get(key);
      }
      for (const key of keys) {
        if (!key || key.length < 4) continue;
        for (const [catalogKey, reference] of byKey.entries()) {
          if (catalogKey.length >= 4 && key.includes(catalogKey)) {
            return reference;
          }
        }
      }
      return null;
    };

    const products = extracted
      .map((product) => {
        const reference = String(product.reference || '').trim();
        const barcode = String(product.barcode || '').trim();
        const qrCode = String(product.qr_code || '').trim();
        const matched = findReference(
          [reference, barcode, qrCode].map(normalize).filter(Boolean)
        );
        return {
          product_name: String(product.product_name || '').trim(),
          reference: reference || matched?.reference || '',
          serial_number: String(product.serial_number || '').trim(),
          brand: String(product.brand || '').trim(),
          model: String(product.model || '').trim(),
          barcode,
          qr_code: qrCode,
          matched_reference: matched ? toReference(matched) : null,
        };
      })
      .filter((product) => product.product_name || product.serial_number);

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}