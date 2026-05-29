import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  // Buscar todos os produtos para montar um mapa id -> category e name -> category
  const products = await base44.asServiceRole.entities.Product.list();
  const categoryById = {};
  const categoryByName = {};

  for (const p of products) {
    if (p.id && p.category) categoryById[p.id] = p.category;
    if (p.name && p.category) categoryByName[p.name.toLowerCase()] = p.category;
  }

  // Mapa de palavras-chave no nome do produto para categoria (fallback)
  const keywordMap = [
    { keywords: ['audeo', 'virto', 'naida', 'bolero', 'sky', 'belong', 'marvel', 'paradise', 'lumity', 'sphere'], category: 'aparelho_auditivo' },
    { keywords: ['bateria', 'battery', 'pilha', '312', '13', '675', '10a'], category: 'bateria' },
    { keywords: ['carregador', 'charger'], category: 'carregador' },
    { keywords: ['cerustop', 'ceru'], category: 'cerustop' },
    { keywords: ['desumidificador', 'dri-aid', 'dry'], category: 'desumidificador' },
    { keywords: ['gancho'], category: 'gancho' },
    { keywords: ['gaveta', 'drawer'], category: 'gaveta' },
    { keywords: ['microfone', 'microphone'], category: 'microfone' },
    { keywords: ['molde', 'mold', 'earmold'], category: 'molde' },
    { keywords: ['oliva', 'dome'], category: 'oliva' },
    { keywords: ['receptor', 'receiver', 'ric'], category: 'receptor' },
    { keywords: ['tubo', 'tube'], category: 'tubo_molde' },
  ];

  const inferCategoryFromName = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    // Tenta pelo nome exato primeiro
    if (categoryByName[lower]) return categoryByName[lower];
    // Tenta por palavras-chave
    for (const { keywords, category } of keywordMap) {
      if (keywords.some(kw => lower.includes(kw))) return category;
    }
    return 'outros';
  };

  // Buscar todas as vendas
  const sales = await base44.asServiceRole.entities.Sale.list();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const sale of sales) {
    if (!sale.items || sale.items.length === 0) { skipped++; continue; }

    // Verificar se algum item já não tem product_category
    const needsUpdate = sale.items.some(item => !item.product_category);
    if (!needsUpdate) { skipped++; continue; }

    const newItems = sale.items.map(item => {
      if (item.product_category) return item; // já tem, não sobrescreve

      // 1. Tenta pelo product_id
      const catById = item.product_id ? categoryById[item.product_id] : null;
      // 2. Tenta pelo nome exato no mapa de produtos
      const catByName = item.product_name ? categoryByName[item.product_name?.toLowerCase()] : null;
      // 3. Infere por palavras-chave
      const catInferred = inferCategoryFromName(item.product_name);

      const finalCategory = catById || catByName || catInferred || 'outros';

      return { ...item, product_category: finalCategory };
    });

    try {
      await base44.asServiceRole.entities.Sale.update(sale.id, { items: newItems });
      updated++;
    } catch (e) {
      errors++;
    }
  }

  return Response.json({
    success: true,
    message: `Migração concluída!`,
    total_vendas: sales.length,
    atualizadas: updated,
    ja_corretas: skipped,
    erros: errors
  });
});