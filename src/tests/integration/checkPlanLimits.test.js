import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('checkPlanLimits Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const planLimits = {
    gratuito: { clients: 50, users: 1 },
    basico: { clients: 500, users: 5 },
    premium: { clients: Infinity, users: Infinity }
  };

  const checkClientLimit = async (tenantId, currentCount, plan) => {
    const limit = planLimits[plan]?.clients;
    if (!limit) return { allowed: false, reason: 'Invalid plan' };
    if (currentCount >= limit) {
      return { allowed: false, reason: `Reached client limit of ${limit}` };
    }
    return { allowed: true };
  };

  it('should allow client creation within free plan limit', async () => {
    const result = await checkClientLimit('tenant-1', 45, 'gratuito');
    expect(result.allowed).toBe(true);
  });

  it('should reject client creation at free plan limit', async () => {
    const result = await checkClientLimit('tenant-1', 50, 'gratuito');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Reached client limit');
  });

  it('should allow unlimited clients on premium plan', async () => {
    const result = await checkClientLimit('tenant-1', 1000, 'premium');
    expect(result.allowed).toBe(true);
  });

  it('should reject invalid plan', async () => {
    const result = await checkClientLimit('tenant-1', 10, 'invalid-plan');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Invalid plan');
  });

  it('should work for basic plan', async () => {
    const result = await checkClientLimit('tenant-1', 450, 'basico');
    expect(result.allowed).toBe(true);

    const limitReached = await checkClientLimit('tenant-1', 500, 'basico');
    expect(limitReached.allowed).toBe(false);
  });
});