const config = require('../config');
const rsvps = require('../repositories/rsvp.repository');
const guestService = require('./guest.service');
const { HttpError } = require('../utils/errors');
const { clean, clamp } = require('../utils/sanitize');

const STATUSES = ['accepted', 'declined'];

/** Saves (or updates) a guest's answer. A personal link wins over the typed name. */
function submit({ token, name, status, phone, seats, note }) {
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Statut invalide');
  const details = {
    phone: clean(phone, 30),
    note: clean(note, 300),
    seats: status === 'accepted' ? clamp(parseInt(seats, 10) || 1, 1, config.limits.maxSeats) : 0,
  };

  if (token) {
    const g = guestService.lookup(token);
    if (!g) throw new HttpError(404, 'Lien invalide');
    return rsvps.upsert({ name: g.name, key: 'guest:' + g.id, status, guestId: g.id, ...details });
  }
  const typed = clean(name, 80);
  if (!typed) throw new HttpError(400, 'Nom requis');
  return rsvps.upsert({ name: typed, key: typed.toLowerCase(), status, guestId: null, ...details });
}

module.exports = { submit, list: rsvps.findAll, remove: rsvps.remove };
