import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const tagValue = (block, name) => {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1].trim() : '';
};

const toNumber = (value) => {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value, digits = 2) => Number(value.toFixed(digits));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const xml = typeof body.xml === 'string' ? body.xml : '';
    if (!xml.trim()) {
      return Response.json({ error: 'Envie o conteúdo do XML' }, { status: 400 });
    }
    if (xml.length > 3000000) {
      return Response.json({ error: 'Arquivo XML muito grande' }, { status: 413 });
    }

    const detBlocks = [...xml.matchAll(/<det\b[^>]*>([\s\S]*?)<\/det>/g)].map(
      (match) => match[1]
    );
    if (!detBlocks.length) {
      return Response.json({ error: 'XML sem itens de nota fiscal' }, { status: 400 });
    }

    const items = detBlocks.map((block) => {
      const quantity = toNumber(tagValue(block, 'qCom')) || 1;
      const total = toNumber(tagValue(block, 'vProd'));
      const unitPrice = toNumber(tagValue(block, 'vUnCom')) || total / quantity;
      return {
        code: tagValue(block, 'cProd'),
        description: tagValue(block, 'xProd'),
        unit: tagValue(block, 'uCom'),
        quantity,
        unit_price: round(unitPrice, 4),
        total: round(total),
        icms: round(toNumber(tagValue(block, 'vICMS'))),
        ipi: round(toNumber(tagValue(block, 'vIPI'))),
      };
    });

    const accessKey = xml.match(/Id="NFe(\d{44})"/);

    return Response.json({
      number: tagValue(xml, 'nNF'),
      series: tagValue(xml, 'serie'),
      issue_date: tagValue(xml, 'dhEmi') || tagValue(xml, 'dEmi'),
      emitter: tagValue(xml, 'xNome'),
      total: round(toNumber(tagValue(xml, 'vNF'))),
      access_key: accessKey ? accessKey[1] : '',
      items,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}