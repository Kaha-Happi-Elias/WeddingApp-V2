/** Tiny in-memory limiter: at most `max` requests per `windowMs` per IP. */
module.exports = function createRateLimiter({ max, windowMs = 60000 }) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: 'Trop de requêtes, réessayez dans une minute.' });
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
};
