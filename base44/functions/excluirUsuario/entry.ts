import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem excluir usuários' }, { status: 403 });
    }

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) return Response.json({ error: 'user_id é obrigatório' }, { status: 400 });
    if (user_id === user.id) {
      return Response.json({ error: 'Você não pode excluir o próprio usuário' }, { status: 400 });
    }

    const target = await base44.asServiceRole.entities.User
      .get(user_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!target) return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });

    await base44.asServiceRole.entities.User.delete(user_id);

    return Response.json({ success: true, deleted_email: target.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}