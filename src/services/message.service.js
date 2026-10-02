const messages = require('../repositories/message.repository');
const guestService = require('./guest.service');
const { HttpError } = require('../utils/errors');
const { clean } = require('../utils/sanitize');

const listPublic = () => messages.latest(200);
const listAll = () => messages.latest(10000);

function create({ author, text, token }) {
  let name = clean(author, 80) || 'Invité';
  if (token) {
    const g = guestService.lookup(token);
    if (g) name = g.name;                 // a personal link cannot be impersonated
  }
  const body = clean(text, 500);
  if (!body) throw new HttpError(400, 'Message vide');
  messages.insert(name, body);
}

module.exports = { listPublic, listAll, create, remove: messages.remove };
