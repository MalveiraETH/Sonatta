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