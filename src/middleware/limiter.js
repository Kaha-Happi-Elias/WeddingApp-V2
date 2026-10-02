/** In-memory sliding-window store: IP → array of timestamps (ms). */
const hits = new Map();

/**
 * Very small anti-spam rate limiter: max 20 write requests per minute per IP.
 * Note: state is in-process only — resets on server restart.
 *
 * @type {import('express').RequestHandler}
 */
function limiter(req, res, next) {
  const now = Date.now();
  const arr = (hits.get(req.ip) || []).filter((t) => now - t < 60_000);

  if (arr.length >= 20) {
    return res
      .status(429)
      .json({ error: 'Trop de requêtes, réessayez dans une minute.' });
  }

  arr.push(now);
  hits.set(req.ip, arr);
  next();
}

module.exports = { limiter };
