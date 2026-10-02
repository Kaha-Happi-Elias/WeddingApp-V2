const crypto = require('crypto');

const ADMIN_USER     = process.env.ADMIN_USER     || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

/**
 * Constant-time string comparison (via SHA-256 hashing) to prevent
 * timing-based credential enumeration attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Express middleware that enforces HTTP Basic Auth for admin routes.
 * Returns 401 with a WWW-Authenticate challenge on failure.
 *
 * @type {import('express').RequestHandler}
 */
function auth(req, res, next) {
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i       = decoded.indexOf(':');
    if (
      safeEqual(decoded.slice(0, i), ADMIN_USER) &&
      safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD)
    ) {
      return next();
    }
  }
  res
    .set('WWW-Authenticate', 'Basic realm="Espace des mariés"')
    .status(401)
    .send('Accès réservé aux mariés.');
}

module.exports = { auth };
