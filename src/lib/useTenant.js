import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Cache em memória para evitar múltiplas buscas por sessão
let cachedTenantId = null;

/**
 * Hook que retorna o tenant_id do usuário logado.
 * - Admin: busca o tenant pelo nome "Sonatta" (único tenant existente)
 * - Outros roles: mesma lógica por ora (app ainda single-tenant visualmente)
 * 
 * Retorna: { tenantId, loading }
 */
export function useTenant() {
  const [tenantId, setTenantId] = useState(cachedTenantId);
  const [loading, setLoading] = useState(!cachedTenantId);

  useEffect(() => {
    if (cachedTenantId) {
      setTenantId(cachedTenantId);
      setLoading(false);
      return;
    }

    base44.entities.Tenant.list().then(tenants => {
      if (tenants.length > 0) {
        cachedTenantId = tenants[0].id;
        setTenantId(tenants[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { tenantId, loading };
}

/**
 * Retorna o filtro de tenant para usar nas queries:
 * { tenant_id: "xxx" }
 */
export function tenantFilter(tenantId) {
  if (!tenantId) return {};
  return { tenant_id: tenantId };
}