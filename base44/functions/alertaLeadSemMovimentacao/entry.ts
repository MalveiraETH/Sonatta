import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = 'malveira.fabio@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'alertas_config' });
    const cfg = settings[0]?.setting_value || {};
    if (cfg['lead_sem_movimentacao'] === false) return Response.json({ ok: true, skipped: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const marcos = [7, 15, 30];
    const alertas = [];

    const leads = await base44.asServiceRole.entities.Client.filter({ status: 'lead' });

    for (const lead of leads) {
      const diffDays = Math.floor((today - new Date(lead.created_date)) / (1000 * 60 * 60 * 24));
      if (!marcos.includes(diffDays)) continue;

      const [appointments, tests, quotes] = await Promise.all([
        base44.asServiceRole.entities.Appointment.filter({ client_id: lead.id }),
        base44.asServiceRole.entities.Test.filter({ client_id: lead.id }),
        base44.asServiceRole.entities.Quote.filter({ client_id: lead.id }),
      ]);

      if (appointments.length === 0 && tests.length === 0 && quotes.length === 0) {
        alertas.push({ lead, dias: diffDays });
      }
    }

    const adminUsers = await base44.asServiceRole.entities.User.filter({ email: ADMIN_EMAIL });
    const adminUserId = adminUsers[0]?.id;

    for (const { lead, dias } of alertas) {
      const msg = `🕐 *LEAD SEM MOVIMENTAÇÃO — ${dias} DIAS*\n\nO cliente *${lead.full_name}* está como *Lead* há *${dias} dias* sem nenhum agendamento, teste ou orçamento registrado.\n\n📞 Telefone: ${lead.phone || '—'}\n📅 Cadastrado em: ${new Date(lead.created_date).toLocaleDateString('pt-BR')}\n\nEntre em contato e avance o funil de vendas.`;
      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        app_user_id: adminUserId,
        metadata: { name: `Alerta: Lead ${dias}d sem movimentação — ${lead.full_name}` }
      });
      await base44.asServiceRole.agents.addMessage(conv, { role: 'user', content: msg });
    }

    return Response.json({ ok: true, alertas_enviados: alertas.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});