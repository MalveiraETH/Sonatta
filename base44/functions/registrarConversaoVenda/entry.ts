import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Chamada quando uma venda é criada — registra no histórico do cliente que foi convertido
// a partir de vendas perdidas. Chamado tanto pela automação entity quanto manualmente.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Suporta chamada autenticada (frontend) ou via service role (automação)
    let clientId = null;
    let saleId   = null;

    const body = await req.json().catch(() => ({}));
    clientId = body.client_id;
    saleId   = body.sale_id;

    if (!clientId) {
      return Response.json({ error: 'client_id obrigatório' }, { status: 400 });
    }

    // Verifica se havia um teste finalizado sem venda antes desta venda
    const tests = await base44.asServiceRole.entities.Test.filter({
      client_id: clientId,
      status: 'teste_finalizado'
    });

    if (!tests || tests.length === 0) {
      return Response.json({ message: 'Nenhum teste finalizado encontrado para este cliente', converted: false });
    }

    // Registra no ServiceHistory como conversão recuperada
    await base44.asServiceRole.entities.ServiceHistory.create({
      client_id: clientId,
      type: 'venda',
      description: `✅ Conversão registrada — cliente havia testado sem comprar e retornou para venda${saleId ? ` (Venda #${saleId})` : ''}.`,
      observations: `Recuperação de venda perdida. Testes anteriores: ${tests.length}. Data de conversão: ${new Date().toLocaleDateString('pt-BR')}.`,
      next_steps: 'Cliente convertido. Agendar pós-venda em 30 dias.'
    });

    return Response.json({ message: 'Conversão registrada com sucesso', converted: true, tests_count: tests.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});