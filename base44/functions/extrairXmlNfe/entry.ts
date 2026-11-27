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

const SERIAL_LABEL = /(S\s*\/?\s*N|S[ÉE]RIES?|N[º°]\s*S[ÉE]RIE)\s*[:.\-º°]?\s*([^\n;]{3,})/gi;

const extractSerials = (text, limit) => {
  const found = [];
  if (!text) return found;
  const upper = text.toUpperCase();
  SERIAL_LABEL.lastIndex = 0;
  let match = SERIAL_LABEL.exec(upper);
  while (match) {
    const tokens = match[2].split(/[\s,;|/]+/);
    for (const token of tokens) {
      const value = token.replace(/[.,;:)\]]+$/, '');
      if (value.length < 4) continue;
      if (!/[0-9]/.test(value)) continue;
      if (!/^[A-Z0-9][A-Z0-9\-.]*$/.test(value)) continue;
      if (!found.includes(value)) found.push(value);
      if (found.length >= limit) return found;
    }
    match = SERIAL_LABEL.exec(upper);
  }
  return found;
};

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
      const barcode = tagValue(block, 'cEAN');
      const serialText = [
        tagValue(block, 'infAdProd'),
        tagValue(block, 'xProd'),
        tagValue(block, 'infCpl'),
        tagValue(block, 'obsCont'),
        tagValue(block, 'obsFisco'),
      ]
        .filter(Boolean)
        .join(' \n ');
      const directSerials = [tagValue(block, 'nSerie'), tagValue(block, 'nLote')].filter(
        (value) => value && /[0-9]/.test(value)
      );
      const serialNumbers = [
        ...new Set([
          ...directSerials.map((value) => value.toUpperCase()),
          ...extractSerials(serialText, Math.max(1, Math.round(quantity))),
        ]),
      ];

      return {
        code: tagValue(block, 'cProd'),
        description: tagValue(block, 'xProd'),
        unit: tagValue(block, 'uCom'),
        quantity,
        unit_price: round(unitPrice, 4),
        total: round(total),
        icms: round(toNumber(tagValue(block, 'vICMS'))),
        ipi: round(toNumber(tagValue(block, 'vIPI'))),
        barcode: barcode && barcode.toUpperCase() !== 'SEM GTIN' ? barcode : '',
        serial_numbers: serialNumbers,
        additional_info: tagValue(block, 'infAdProd'),
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