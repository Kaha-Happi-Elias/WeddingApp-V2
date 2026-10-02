const crypto = require('crypto');
const db = require('../database/connection');
const config = require('../config');
const guests = require('../repositories/guest.repository');
const rsvps = require('../repositories/rsvp.repository');
const { HttpError } = require('../utils/errors');
const { clean } = require('../utils/sanitize');

const codeFor = id => 'G' + String(id).padStart(3, '0');
const lookup = token => guests.findByToken(String(token || '').slice(0, 40));

/** The guest behind a personal link, or an HttpError(404). */
function requireByToken(token) {
  const g = lookup(token);
  if (!g) throw new HttpError(404, 'Lien invalide');
  return g;
}

/** What the guest page needs to know about its owner. */
function getPublicProfile(token) {
  const g = requireByToken(token);
  return {
    name: g.name, status: g.status || null, table: g.table_label || null,
    phone: g.phone || '', seats: g.seats || 1, note: g.note || '', code: codeFor(g.id),
  };
}

const list = () => guests.findAll();

/** Accepts "Name" or "Name | Table" lines (string or array) and creates one personal link each. */
function createMany(input) {
  const lines = Array.isArray(input) ? input : String(input || '').split(/\r?\n/);
  const people = lines.map(line => {
    const [name, table] = String(line).split(/[|;]/);
    return { name: clean(name, 80), table: clean(table, 40) || null };
  }).filter(p => p.name).slice(0, config.limits.maxNames);
  if (!people.length) throw new HttpError(400, 'Aucun nom');

  return db.transaction(() => people.map(p => {
    const token = crypto.randomBytes(9).toString('base64url');   // 12 unguessable characters
    guests.insert(token, p.name, p.table);
    return { name: p.name, token };
  }))();
}

/** Deleting a guest also deletes their answer. */
const remove = id => db.transaction(() => { rsvps.removeByGuest(id); guests.remove(id); })();

module.exports = { lookup, getPublicProfile, list, createMany, remove };
