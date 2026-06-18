import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Lê todas as permissões usando service role (ignora RLS),
        // assim qualquer usuário autenticado recebe as permissões configuradas
        // sem precisar de acesso direto à entidade.
        const records = await base44.asServiceRole.entities.PermissionSettings.list();

        return Response.json({ permissions: records });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});