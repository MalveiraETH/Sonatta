import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Migra UMA entidade por vez para evitar rate limit.
// Passe { entity: "Client" } no payload. 
// Se não passar entity, apenas cria/busca o tenant e retorna o tenant_id.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const entityName = body.entity || null;
    const tenantIdOverride = body.tenant_id || null;
    const maxRecords = body.max_records || 50; // limita quantos migrar por chamada

    // 1. Buscar o tenant Sonatta
    const existingTenants = await base44.asServiceRole.entities.Tenant.filter({ name: 'Sonatta - Aparelhos Auditivos Manaus' });
    
    let tenantId;
    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
    } else {
      return Response.json({ error: 'Tenant Sonatta não encontrado. Crie primeiro.' }, { status: 404 });
    }

    if (tenantIdOverride) tenantId = tenantIdOverride;

    // Se não passou entidade, só retorna o tenant_id
    if (!entityName) {
      return Response.json({ success: true, tenant_id: tenantId, message: 'Tenant encontrado. Passe { entity: "NomeEntidade" } para migrar.' });
    }

    // 2. Buscar registros sem tenant_id (limitado a maxRecords por chamada)
    const records = await base44.asServiceRole.entities[entityName].list('-created_date', 2000);
    const allToUpdate = records.filter(r => !r.tenant_id);
    const toUpdate = allToUpdate.slice(0, maxRecords);

    if (toUpdate.length === 0) {
      return Response.json({ success: true, tenant_id: tenantId, entity: entityName, migrated: 0, remaining: 0, message: 'Nenhum registro para migrar.' });
    }

    // 3. Atualizar um por um com pausa de 600ms
    let updated = 0;
    for (const r of toUpdate) {
      await base44.asServiceRole.entities[entityName].update(r.id, { tenant_id: tenantId });
      updated++;
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const remaining = allToUpdate.length - updated;
    return Response.json({
      success: true,
      tenant_id: tenantId,
      entity: entityName,
      total: records.length,
      migrated: updated,
      remaining,
      message: `${updated} migrado(s). ${remaining > 0 ? `${remaining} ainda pendentes — rode novamente.` : 'Todos migrados!'}`
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});