const db = require('../database/connection');

const q = {
  byToken: db.prepare(`SELECT g.id, g.name, g.table_label, r.status, r.phone, r.seats, r.note
    FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE g.token = ?`),
  all: db.prepare(`SELECT g.id, g.name, g.token, g.table_label, g.created_at, r.status
    FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id ORDER BY g.name COLLATE NOCASE`),
  insert: db.prepare('INSERT INTO guests (token, name, table_label) VALUES (?, ?, ?)'),
  remove: db.prepare('DELETE FROM guests WHERE id = ?'),
};

module.exports = {
  findByToken: token => q.byToken.get(token),
  findAll: () => q.all.all(),
  insert: (token, name, table) => q.insert.run(token, name, table),
  remove: id => q.remove.run(id),
};
