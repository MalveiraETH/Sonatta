import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from './useTenant';

export function usePlanLimits(resource) {
  const { tenantId } = useTenant();
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const checkLimits = async () => {
      try {
        const res = await base44.functions.invoke('checkPlanLimits', { resource });
        setLimits(res.data);
      } catch (e) {
        console.error('Error checking limits:', e);
      } finally {
        setLoading(false);
      }
    };

    checkLimits();
  }, [tenantId, resource]);

  return { limits, loading, isAllowed: limits?.allowed ?? true };
}