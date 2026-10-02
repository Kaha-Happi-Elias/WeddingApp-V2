const crypto = require('crypto');
const config = require('../config');

const same = (a, b) => crypto.timingSafeEqual(
  crypto.createHash('sha256').update(String(a)).digest(),
  crypto.createHash('sha256').update(String(b)).digest());

/** HTTP Basic authentication for the newlyweds' area. */
module.exports = function basicAuth(req, res, next) {
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i = decoded.indexOf(':');
    if (same(decoded.slice(0, i), config.admin.user) && same(decoded.slice(i + 1), config.admin.password)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Espace des mariés"').status(401).send('Accès réservé aux mariés.');
};
