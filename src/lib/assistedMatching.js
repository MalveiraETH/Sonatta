export const normalizeText = (value) =>
  (value || '')
    .toString()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

export function findXmlMatch(item, xmlItems, used = new Set()) {
  if (!xmlItems?.length) return null;
  const reference = normalizeText(item.reference);
  const name = normalizeText(item.product_name);

  for (let index = 0; index < xmlItems.length; index += 1) {
    if (used.has(index)) continue;
    const xml = xmlItems[index];
    const code = normalizeText(xml.code);
    const description = normalizeText(xml.description);
    if (reference && code && (code === reference || description.includes(reference))) {
      return index;
    }
  }

  for (let index = 0; index < xmlItems.length; index += 1) {
    if (used.has(index)) continue;
    const description = normalizeText(xmlItems[index].description);
    if (name && description && description.includes(name)) return index;
  }

  return null;
}

export function xmlValues(xmlItem) {
  const quantity = Number(xmlItem?.quantity) || 1;
  return {
    product_cost: Number((Number(xmlItem?.total || 0) / quantity).toFixed(2)),
    icms: Number((Number(xmlItem?.icms || 0) / quantity).toFixed(2)),
    ipi: Number((Number(xmlItem?.ipi || 0) / quantity).toFixed(2)),
  };
}