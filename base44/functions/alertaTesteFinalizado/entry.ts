import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['teste_finalizado_sem_orcamento'] === false) return Response.json({ ok: true, skipped: true });

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const tests = await base44.asServiceRole.entities.Test.filter({ status: 'teste_finalizado' });
    const alertas = [];

    for (const test of tests) {
      if (!test.end_date) continue;
      const endStr = new Date(test.end_date).toISOString().split('T')[0];
      if (endStr !== twoDaysAgoStr) continue;

      const quotes = await base44.asServiceRole.entities.Quote.filter({ client_id: test.client_id });
      const hasQuote = quotes.some(q => new Date(q.created_date) >= new Date(test.end_date));
      if (!hasQuote) alertas.push(test);
    }

    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

    for (const test of alertas) {
      const msg = `📋 *ORÇAMENTO PENDENTE APÓS TESTE*\n\nO teste *${test.test_number || test.id}* do cliente *${test.client_name}* foi finalizado há 2 dias, mas *nenhum orçamento foi registrado*.\n\n📅 Finalizado em: ${new Date(test.end_date).toLocaleDateString('pt-BR')}\n\nContate o cliente e registre o orçamento o quanto antes.`;
      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        app_user_id: adminUserId,
        metadata: { name: `Alerta: Orçamento Pendente — ${test.client_name}` }
      });
      await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});