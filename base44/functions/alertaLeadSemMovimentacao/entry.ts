import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Roda diariamente. Verifica leads criados há 7, 15 ou 30 dias sem agendamento, teste ou orçamento.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const marcos = [7, 15, 30];
    const alertas = [];

    const leads = await base44.asServiceRole.entities.Client.filter({ status: 'lead' });

    for (const lead of leads) {
      const createdDate = new Date(lead.created_date);
      const diffDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

      if (!marcos.includes(diffDays)) continue;

      // Verifica se há agendamento, teste ou orçamento vinculado
      const [appointments, tests, quotes] = await Promise.all([
        base44.asServiceRole.entities.Appointment.filter({ client_id: lead.id }),
        base44.asServiceRole.entities.Test.filter({ client_id: lead.id }),
        base44.asServiceRole.entities.Quote.filter({ client_id: lead.id }),
      ]);

      const temMovimentacao = appointments.length > 0 || tests.length > 0 || quotes.length > 0;

      if (!temMovimentacao) {
        alertas.push({ lead, dias: diffDays });
      }
    }

    for (const { lead, dias } of alertas) {
      const msg = `🕐 *LEAD SEM MOVIMENTAÇÃO — ${dias} DIAS*\n\nO cliente *${lead.full_name}* está como *Lead* há *${dias} dias* sem nenhum agendamento, teste ou orçamento registrado.\n\n📞 Telefone: ${lead.phone || '—'}\n📅 Cadastrado em: ${new Date(lead.created_date).toLocaleDateString('pt-BR')}\n\nEntre em contato e avance o funil de vendas.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Lead ${dias}d sem movimentação — ${lead.full_name}` }
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