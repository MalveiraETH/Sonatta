import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    const testId = event?.entity_id || data?.id;
    const clientName = data?.client_name || 'Cliente';
    const testNumber = data?.test_number || testId;
    const endDate = data?.end_date ? new Date(data.end_date).toLocaleDateString('pt-BR') : '—';

    const msg = `⚠️ *TESTE PENDENTE*\n\nO teste *${testNumber}* do cliente *${clientName}* entrou em status *Pendente*.\n\n📅 Data de término prevista: ${endDate}\n\nVerifique a situação do teste e tome as providências necessárias.`;

    const conv = await base44.asServiceRole.agents.createConversation({
      agent_name: 'assistente_sonatta',
      metadata: { name: `Alerta: Teste Pendente — ${clientName}` }
    });

    await base44.asServiceRole.agents.addMessage(conv, {
      role: 'user',
      content: msg
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});