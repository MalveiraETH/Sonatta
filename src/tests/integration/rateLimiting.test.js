import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Rate Limiting Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRateLimiter = (maxRequests, windowMs) => {
    const requests = new Map();

    return {
      checkLimit: (userId, action) => {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const timestamps = (requests.get(key) || []).filter(t => now - t < windowMs);

        if (timestamps.length >= maxRequests) {
          const resetTime = Math.ceil((timestamps[0] + windowMs - now) / 1000);
          return {
            limited: true,
            remaining: 0,
            resetAfter: resetTime
          };
        }

        timestamps.push(now);
        requests.set(key, timestamps);

        return {
          limited: false,
          remaining: maxRequests - timestamps.length,
          resetAfter: null
        };
      }
    };
  };

  it('should allow requests within limit', () => {
    const limiter = createRateLimiter(5, 60000);

    for (let i = 0; i < 5; i++) {
      const result = limiter.checkLimit('user-1', 'create_client');
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it('should reject requests exceeding limit', () => {
    const limiter = createRateLimiter(3, 60000);

    // Use up the limit
    for (let i = 0; i < 3; i++) {
      limiter.checkLimit('user-1', 'create_client');
    }

    // Next request should be limited
    const result = limiter.checkLimit('user-1', 'create_client');
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.resetAfter).toBeGreaterThan(0);
  });

  it('should track different actions separately', () => {
    const limiter = createRateLimiter(2, 60000);

    const result1 = limiter.checkLimit('user-1', 'create_client');
    const result2 = limiter.checkLimit('user-1', 'create_sale');

    expect(result1.limited).toBe(false);
    expect(result2.limited).toBe(false);
  });

  it('should track different users separately', () => {
    const limiter = createRateLimiter(1, 60000);

    const result1 = limiter.checkLimit('user-1', 'create_client');
    const result2 = limiter.checkLimit('user-2', 'create_client');

    expect(result1.limited).toBe(false);
    expect(result2.limited).toBe(false);
  });

  it('should return correct reset time', () => {
    const limiter = createRateLimiter(1, 5000);

    limiter.checkLimit('user-1', 'create_client');
    const result = limiter.checkLimit('user-1', 'create_client');

    expect(result.resetAfter).toBeGreaterThan(0);
    expect(result.resetAfter).toBeLessThanOrEqual(5);
  });
});