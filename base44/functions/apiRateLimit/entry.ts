import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory rate limiter with cleanup
const limitStore = new Map();
const LIMITS = {
  'create_client': { requests: 10, windowMs: 60000 },
  'create_sale': { requests: 20, windowMs: 60000 },
  'create_appointment': { requests: 30, windowMs: 60000 },
  'default': { requests: 100, windowMs: 60000 }
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of limitStore.entries()) {
    const config = LIMITS[key] || LIMITS.default;
    const filtered = timestamps.filter(t => now - t < config.windowMs);
    if (filtered.length === 0) {
      limitStore.delete(key);
    } else {
      limitStore.set(key, filtered);
    }
  }
}, 5 * 60 * 1000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();
    if (!action) return Response.json({ error: 'Missing action' }, { status: 400 });

    const key = `${user.id}:${action}`;
    const config = LIMITS[action] || LIMITS.default;
    const now = Date.now();

    // Get existing requests in window
    const timestamps = (limitStore.get(key) || []).filter(t => now - t < config.windowMs);
    
    if (timestamps.length >= config.requests) {
      const resetTime = Math.ceil((timestamps[0] + config.windowMs - now) / 1000);
      return Response.json({
        limited: true,
        message: `Rate limit exceeded. Reset in ${resetTime}s`,
        resetAfter: resetTime
      }, { status: 429 });
    }

    timestamps.push(now);
    limitStore.set(key, timestamps);

    return Response.json({
      limited: false,
      remaining: config.requests - timestamps.length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});