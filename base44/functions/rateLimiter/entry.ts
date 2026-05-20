// In-memory rate limiter (for single instance; use Redis for distributed)
const requestLog = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per minute

export function rateLimitMiddleware(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
  const key = `${ip}:${new URL(req.url).pathname}`;
  const now = Date.now();

  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }

  const requests = requestLog.get(key).filter(t => now - t < WINDOW_MS);
  requests.push(now);
  requestLog.set(key, requests);

  if (requests.length > MAX_REQUESTS) {
    return {
      limited: true,
      message: 'Too many requests. Try again later.',
      retryAfter: Math.ceil((requests[0] + WINDOW_MS - now) / 1000)
    };
  }

  return { limited: false };
}