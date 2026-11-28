export const normalizeText = (value) =>
  (value || '')
    .toString()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

// Encontra o Produto de Referência cujo código equivale ao código do item da nota
export function findReferenceByCode(references, code, description) {
  if (!references?.length) return null;
  const normalizedCode = normalizeText(code);
  if (normalizedCode) {
    const exact = references.find((ref) => normalizeText(ref.reference) === normalizedCode);
    if (exact) return exact;
    const partial = references.find((ref) => {
      const refCode = normalizeText(ref.reference);
      return refCode.length >= 4 && normalizedCode.includes(refCode);
    });
    if (partial) return partial;
  }
  const normalizedDescription = normalizeText(description);
  if (normalizedDescription) {
    return (
      references.find((ref) => {
        const refName = normalizeText(ref.name);
        return refName.length >= 6 && normalizedDescription.includes(refName);
      }) || null
    );
  }
  return null;
}

// Vincula as séries lidas nas fotos aos itens da nota, casando por REF e depois por nome.
// Cada item recebe no máximo uma série; itens que já têm série são preservados.
export function associatePhotoSerials(items, detected) {
  const next = items.map((item) => ({ ...item }));
  const used = new Set();
  const unmatched = [];
  let filled = 0;

  const pick = (predicate) => next.find((item) => !used.has(item.id) && !item.serial_number && predicate(item));

  (detected || []).forEach((product) => {
    const serial = (product.serial_number || '').trim();
    const ref = normalizeText(product.reference);
    const name = normalizeText(product.product_name);

    let target = ref ? pick((item) => normalizeText(item.reference) === ref) : null;
    if (!target && ref && ref.length >= 4) {
      target = pick((item) => {
        const itemRef = normalizeText(item.reference);
        return itemRef.length >= 4 && (itemRef.includes(ref) || ref.includes(itemRef));
      });
    }
    if (!target && name) target = pick((item) => normalizeText(item.product_name) === name);
    if (!target && name && name.length >= 8) {
      target = pick((item) => {
        const itemName = normalizeText(item.product_name);
        return itemName.length >= 8 && (itemName.includes(name) || name.includes(itemName));
      });
    }

    if (!target) {
      if (serial) unmatched.push({ ...product, serial_number: serial });
      return;
    }

    used.add(target.id);
    if (serial) {
      target.serial_number = serial;
      filled += 1;
    }
    if (!target.brand && product.brand) target.brand = product.brand;
    if (!target.model && product.model) target.model = product.model;
    if (!target.product_name && product.product_name) target.product_name = product.product_name;
    if (!target.reference && product.reference) target.reference = product.reference;
  });

  return { items: next, filled, unmatched };
}