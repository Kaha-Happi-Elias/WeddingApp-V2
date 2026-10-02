const db = require('../database/connection');
const { NOW } = require('../database/migrations');

const q = {
  upsert: db.prepare(`
    INSERT INTO rsvps (name, name_key, status, guest_id, phone, seats, note)
    VALUES (@name, @key, @status, @guestId, @phone, @seats, @note)
    ON CONFLICT(name_key) DO UPDATE SET
      name = excluded.name, status = excluded.status, phone = excluded.phone,
      seats = excluded.seats, note = excluded.note, updated_at = ${NOW}`),
  all: db.prepare(`SELECT r.id, r.name, r.status, r.phone, r.seats, r.note, r.created_at, r.updated_at, g.table_label
    FROM rsvps r LEFT JOIN guests g ON g.id = r.guest_id ORDER BY r.updated_at DESC`),
  remove: db.prepare('DELETE FROM rsvps WHERE id = ?'),
  removeByGuest: db.prepare('DELETE FROM rsvps WHERE guest_id = ?'),
  counts: db.prepare(`SELECT
    COALESCE(SUM(status='accepted'),0) AS accepted,
    COALESCE(SUM(status='declined'),0) AS declined,
    COALESCE(SUM(CASE WHEN status='accepted' THEN seats END),0) AS seats,
    COUNT(*) AS total FROM rsvps`),
  pending: db.prepare('SELECT COUNT(*) AS n FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE r.id IS NULL'),
};

module.exports = {
  upsert: row => q.upsert.run(row),
  findAll: () => q.all.all(),
  remove: id => q.remove.run(id),
  removeByGuest: guestId => q.removeByGuest.run(guestId),
  counts: () => q.counts.get(),
  countPendingGuests: () => q.pending.get().n,
};
