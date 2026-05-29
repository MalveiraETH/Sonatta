import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['estoque_baixo'] === false) return Response.json({ ok: true, skipped: true });

    const productName = data?.name || 'Produto';
    const quantity = data?.quantity ?? 0;
    const minStock = data?.min_stock ?? 5;
    const category = data?.category || '—';

    const msg = `📦 *ESTOQUE BAIXO*\n\nO produto *${productName}* atingiu o limite de estoque baixo.\n\n🔢 Quantidade atual: ${quantity}\n⚠️ Estoque mínimo: ${minStock}\n🏷️ Categoria: ${category}\n\nRealize a reposição do estoque o quanto antes.`;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      metadata: { name: `Alerta: Estoque Baixo — ${productName}` }
    });
    await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});