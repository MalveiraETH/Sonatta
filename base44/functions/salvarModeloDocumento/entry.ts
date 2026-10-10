import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MODULE_NAME = 'Modelos';
const CATEGORIES = ['documento', 'prontuario'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const action = body?.action;
    const template = body?.template || {};

    // Verifica a permissão efetiva do papel do usuário para a ação solicitada
    const requiredAction = action === 'delete' ? 'Excluir modelos' : 'Criar/Editar modelos';
    let allowed = user.role === 'admin';
    if (!allowed) {
      const permissions = await base44.asServiceRole.entities.PermissionSettings.list();
      const permission = permissions.find(
        (p) => p.module === MODULE_NAME && p.action === requiredAction
      );
      allowed = !!(permission && permission[user.role]);
    }
    if (!allowed) {
      return Response.json(
        { error: 'Você não tem permissão para esta ação' },
        { status: 403 }
      );
    }

    if (action === 'delete') {
      if (!template.id) return Response.json({ error: 'Modelo não informado' }, { status: 400 });
      await base44.asServiceRole.entities.DocumentTemplate.delete(template.id);
      return Response.json({ success: true });
    }

    if (action !== 'save') {
      return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const name = (template.name || '').trim();
    const category = template.category;
    if (!name) return Response.json({ error: 'Informe o nome do modelo' }, { status: 400 });
    if (!CATEGORIES.includes(category)) {
      return Response.json({ error: 'Categoria inválida' }, { status: 400 });
    }

    const data = {
      name,
      category,
      content: template.content || '',
      is_active: template.is_active !== false,
      updated_by_name: user.full_name || '',
    };

    if (template.id) {
      const updated = await base44.asServiceRole.entities.DocumentTemplate.update(template.id, data);
      return Response.json({ success: true, template: updated });
    }

    const created = await base44.asServiceRole.entities.DocumentTemplate.create({
      ...data,
      created_by_name: user.full_name || '',
    });
    return Response.json({ success: true, template: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}