import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Chamado por automação agendada (diária). Verifica testes finalizados há 2+ dias sem orçamento.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // Busca testes finalizados
    const tests = await base44.asServiceRole.entities.Test.filter({ status: 'teste_finalizado' });

    const alertas = [];

    for (const test of tests) {
      if (!test.end_date) continue;

      // Só processa testes finalizados há exatamente 2 dias (comparando datas)
      const endDate = new Date(test.end_date);
      const endStr = endDate.toISOString().split('T')[0];
      if (endStr !== twoDaysAgoStr) continue;

      // Verifica se existe algum orçamento para o cliente após a data de finalização
      const quotes = await base44.asServiceRole.entities.Quote.filter({ client_id: test.client_id });
      const hasQuote = quotes.some(q => {
        const createdDate = new Date(q.created_date);
        return createdDate >= endDate;
      });

      if (!hasQuote) {
        alertas.push(test);
      }
    }

    for (const test of alertas) {
      const msg = `📋 *ORÇAMENTO PENDENTE APÓS TESTE*\n\nO teste *${test.test_number || test.id}* do cliente *${test.client_name}* foi finalizado há 2 dias, mas *nenhum orçamento foi registrado*.\n\n📅 Finalizado em: ${new Date(test.end_date).toLocaleDateString('pt-BR')}\n\nContate o cliente e registre o orçamento o quanto antes.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Orçamento Pendente — ${test.client_name}` }
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