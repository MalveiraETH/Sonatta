// Client-side rate limiting helper
const requestCache = new Map();

export function isRateLimited(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  
  if (!requestCache.has(key)) {
    requestCache.set(key, []);
  }

  const requests = requestCache.get(key).filter(t => now - t < windowMs);
  requests.push(now);
  requestCache.set(key, requests);

  return requests.length > maxRequests;
}

export function clearRateLimit(key) {
  requestCache.delete(key);
}