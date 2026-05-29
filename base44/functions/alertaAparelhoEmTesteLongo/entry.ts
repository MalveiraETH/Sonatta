import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Roda diariamente. Verifica testes em andamento com aparelhos há 21+ dias sem venda registrada.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const LIMITE_DIAS = 21;

    const statusAtivos = ['em_teste', 'teste_estendido', 'teste_agendado'];
    const tests = await base44.asServiceRole.entities.Test.filter({});
    const ativos = tests.filter(t => statusAtivos.includes(t.status) && t.devices && t.devices.length > 0);

    const alertas = [];

    for (const test of ativos) {
      const startDate = new Date(test.start_date);
      const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

      if (diffDays < LIMITE_DIAS) continue;

      // Verifica se o marco é exato (21, 30, 45 dias) para não enviar todo dia
      const marcos = [21, 30, 45, 60];
      if (!marcos.includes(diffDays)) continue;

      // Verifica se não houve venda para o cliente após o início do teste
      const sales = await base44.asServiceRole.entities.Sale.filter({ client_id: test.client_id });
      const hasSale = sales.some(s => new Date(s.created_date) >= startDate);

      if (!hasSale) {
        alertas.push({ test, dias: diffDays });
      }
    }

    for (const { test, dias } of alertas) {
      const aparelhos = (test.devices || []).map(d => `• ${d.product_name || '—'} (S/N: ${d.serial_number || '—'})`).join('\n');

      const msg = `📦 *APARELHO EM TESTE HÁ ${dias} DIAS SEM VENDA*\n\nO cliente *${test.client_name}* está com aparelhos em teste há *${dias} dias* e nenhuma venda foi registrada.\n\n🎧 Aparelhos:\n${aparelhos}\n\n📅 Início do teste: ${new Date(test.start_date).toLocaleDateString('pt-BR')}\n\nVerifique a intenção de compra do cliente e registre o próximo passo.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Aparelho em Teste ${dias}d — ${test.client_name}` }
      });

      await base44.asServiceRole.agents.addMessage(conv, {
        role: 'user',
        content: msg
      });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});