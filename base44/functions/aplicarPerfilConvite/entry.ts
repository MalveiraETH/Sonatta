import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Aplica o perfil de acesso definido no convite quando a pessoa entra pela primeira vez.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Chamada pelo hook de primeiro acesso, quando ainda não há sessão de usuário no app.
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return Response.json({ allow: true });

    const result = await base44.asServiceRole.entities.AccessInvite.filter({ email });
    const list = Array.isArray(result) ? result : result?.items || [];
    const invite = list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    if (!invite) return Response.json({ allow: true });

    if (invite.status === 'cancelado') {
      return Response.json({
        allow: false,
        reason: 'Seu convite de acesso foi cancelado. Fale com o administrador da Sonatta.',
      });
    }

    if (invite.status === 'pendente') {
      await base44.asServiceRole.entities.AccessInvite.update(invite.id, {
        status: 'aceito',
        accepted_at: new Date().toISOString(),
      });
    }

    return Response.json({ allow: true, role: invite.role || 'user' });
  } catch (error) {
    // Nunca bloqueia o acesso por falha interna: o perfil pode ser ajustado depois pelo administrador.
    return Response.json({ allow: true, error: error.message });
  }
}