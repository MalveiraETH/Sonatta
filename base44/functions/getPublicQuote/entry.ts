import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const quoteId = body.quoteId;

    if (!quoteId) {
      return Response.json({ error: 'quoteId é obrigatório' }, { status: 400 });
    }

    const quote = await base44.asServiceRole.entities.Quote.get(quoteId);

    if (!quote) {
      return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    return Response.json({ quote });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});