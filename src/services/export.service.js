const rsvps = require('../repositories/rsvp.repository');
const guests = require('../repositories/guest.repository');
const { toCsv } = require('../utils/csv');

const LABEL = { accepted: 'Accepté', declined: 'Décliné' };

/** Every answer, plus the invited guests who have not answered yet. */
function guestListCsv() {
  const rows = [['Nom', 'Réponse', 'Places', 'Téléphone', 'Table', 'Note', 'Date']]
    .concat(rsvps.findAll().map(r => [r.name, LABEL[r.status], r.seats, r.phone, r.table_label, r.note, r.updated_at]))
    .concat(guests.findAll().filter(g => !g.status).map(g => [g.name, 'En attente', '', '', g.table_label, '', '']));
  return toCsv(rows);
}
module.exports = { guestListCsv };
