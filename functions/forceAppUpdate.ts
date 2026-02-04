import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { description } = await req.json();

        // Criar nova versão
        await base44.entities.AppVersion.create({
            version_timestamp: Date.now(),
            description: description || 'Atualização do sistema'
        });

        return Response.json({ 
            success: true, 
            message: 'Atualização forçada para todos os usuários' 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});