import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tool_configs } = await req.json();

    if (!Array.isArray(tool_configs)) {
      return Response.json({ error: 'tool_configs must be an array' }, { status: 400 });
    }

    // Salva em AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'agent_permissions' });
    if (settings.length > 0) {
      await base44.asServiceRole.entities.AppSettings.update(settings[0].id, {
        setting_value: { tool_configs },
      });
    } else {
      await base44.asServiceRole.entities.AppSettings.create({
        setting_key: 'agent_permissions',
        setting_value: { tool_configs },
        description: 'Permissões de acesso do Assistente Sonatta',
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});