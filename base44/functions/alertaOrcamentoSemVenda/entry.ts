import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Chamado por automação agendada (diária). Verifica orçamentos sem venda nos marcos de 10, 20 e 30 dias.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const marcos = [10, 20, 30];

    const alertas = [];

    for (const dias of marcos) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - dias);
      const targetStr = targetDate.toISOString().split('T')[0];

      // Orçamentos que não foram convertidos em venda
      const quotes = await base44.asServiceRole.entities.Quote.filter({});
      const matchingQuotes = quotes.filter(q => {
        if (q.status === 'convertido' || q.status === 'recusado') return false;
        const createdStr = new Date(q.created_date).toISOString().split('T')[0];
        return createdStr === targetStr;
      });

      for (const quote of matchingQuotes) {
        // Verifica se existe venda para o cliente após a criação do orçamento
        const sales = await base44.asServiceRole.entities.Sale.filter({ client_id: quote.client_id });
        const quoteCreated = new Date(quote.created_date);
        const hasSale = sales.some(s => new Date(s.created_date) >= quoteCreated);

        if (!hasSale) {
          alertas.push({ quote, dias });
        }
      }
    }

    for (const { quote, dias } of alertas) {
      const valor = quote.total ? `R$ ${Number(quote.total).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '—';
      const msg = `💰 *ORÇAMENTO SEM VENDA — ${dias} DIAS*\n\nO orçamento *${quote.quote_number || quote.id}* do cliente *${quote.client_name}* foi gerado há *${dias} dias* e ainda *não resultou em venda*.\n\n💵 Valor: ${valor}\n📅 Gerado em: ${new Date(quote.created_date).toLocaleDateString('pt-BR')}\n\nEntre em contato com o cliente para dar continuidade ao processo.`;

      const conv = await base44.asServiceRole.agents.createConversation({
        agent_name: 'assistente_sonatta',
        metadata: { name: `Alerta: Orçamento ${dias}d sem venda — ${quote.client_name}` }
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