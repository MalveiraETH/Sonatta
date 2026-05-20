import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client');

// Hook to test
const useTenant = () => {
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const user = await base44.auth.me();
        const tenants = await base44.entities.Tenant.list();
        const userTenant = tenants?.find(t => t.id === user?.tenant_id);
        setTenantId(userTenant?.id);
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, []);

  return { tenantId, loading };
};

describe('useTenant Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch tenant ID on mount', async () => {
    base44.auth.me.mockResolvedValue({ id: 'user-1', tenant_id: 'tenant-1' });
    base44.entities.Tenant.list.mockResolvedValue([
      { id: 'tenant-1', name: 'Test Clinic' }
    ]);

    const { result } = renderHook(() => useTenant());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tenantId).toBe('tenant-1');
  });

  it('should handle missing user', async () => {
    base44.auth.me.mockResolvedValue(null);
    base44.entities.Tenant.list.mockResolvedValue([]);

    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tenantId).toBe(undefined);
  });
});