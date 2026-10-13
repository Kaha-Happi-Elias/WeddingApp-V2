const messages = require('../repositories/message.repository');
const guestService = require('./guest.service');
const { HttpError } = require('../utils/errors');
const { clean } = require('../utils/sanitize');

const listPublic = token => (token ? messages.byToken(token) : []);
const listAll = () => messages.latest(10000);

function create({ author, text, token }) {
  let name = clean(author, 80) || 'Invité';
  let guestId = null;
  if (token) {
    const g = guestService.lookup(token);
    if (g) {
      name = g.name;                 // a personal link cannot be impersonated
      guestId = g.id;
    }
  }
  const body = clean(text, 500);
  if (!body) throw new HttpError(400, 'Message vide');
  messages.insert(name, body, token || null, guestId);
}

module.exports = { listPublic, listAll, create, remove: messages.remove };
