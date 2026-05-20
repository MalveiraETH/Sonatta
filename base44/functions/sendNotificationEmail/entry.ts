import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Bem-vindo ao Sonatta!',
    body: (name, tenantName) => `
      <h2>Olá ${name}!</h2>
      <p>Você foi convidado para a clínica <strong>${tenantName}</strong> na plataforma Sonatta.</p>
      <p>Acesse <a href="https://sonatta.app">https://sonatta.app</a> para começar.</p>
    `,
  },
  new_client: {
    subject: 'Novo cliente cadastrado',
    body: (name, clientName) => `
      <p>Olá ${name},</p>
      <p>Um novo cliente <strong>${clientName}</strong> foi cadastrado em seu sistema.</p>
    `,
  },
  new_sale: {
    subject: 'Nova venda registrada',
    body: (name, saleNumber, clientName, total) => `
      <p>Olá ${name},</p>
      <p>Nova venda #${saleNumber} de <strong>${clientName}</strong> no valor de <strong>R$ ${total.toFixed(2)}</strong>.</p>
    `,
  },
  payment_received: {
    subject: 'Pagamento recebido',
    body: (name, amount) => `
      <p>Olá ${name},</p>
      <p>Pagamento de <strong>R$ ${amount.toFixed(2)}</strong> foi recebido.</p>
    `,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template, to, data } = await req.json();
    if (!EMAIL_TEMPLATES[template]) return Response.json({ error: 'Invalid template' }, { status: 400 });

    const emailTemplate = EMAIL_TEMPLATES[template];
    const body = emailTemplate.body(...data);

    await base44.integrations.Core.SendEmail({
      to,
      subject: emailTemplate.subject,
      body,
      from_name: 'Sonatta Clínica Auditiva',
    });

    return Response.json({ sent: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});