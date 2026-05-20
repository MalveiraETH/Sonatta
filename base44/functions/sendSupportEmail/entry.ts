import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, message, category } = await req.json();
    if (!subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const body = `
      <h3>Novo contato de suporte</h3>
      <p><strong>Usuário:</strong> ${user.full_name} (${user.email})</p>
      <p><strong>Categoria:</strong> ${category || 'Geral'}</p>
      <p><strong>Assunto:</strong> ${subject}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

    await base44.integrations.Core.SendEmail({
      to: 'suporte@sonatta.com.br',
      subject: `[${category || 'SUPORTE'}] ${subject}`,
      body,
      from_name: 'Sistema Sonatta',
    });

    // Confirm to user
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Recebemos sua mensagem de suporte',
      body: `<p>Olá ${user.full_name},</p><p>Recebemos sua mensagem e responderemos em breve.</p><p>Obrigado!</p>`,
      from_name: 'Suporte Sonatta',
    });

    return Response.json({ sent: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});