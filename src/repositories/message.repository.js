const db = require('../database/connection');

const q = {
  insert: db.prepare('INSERT INTO messages (author, text, token, guest_id) VALUES (?, ?, ?, ?)'),
  byToken: db.prepare('SELECT id, author, text, created_at FROM messages WHERE token = ? ORDER BY id DESC'),
  latest: db.prepare('SELECT id, author, text, created_at FROM messages ORDER BY id DESC LIMIT ?'),
  remove: db.prepare('DELETE FROM messages WHERE id = ?'),
  count: db.prepare('SELECT COUNT(*) AS n FROM messages'),
};

module.exports = {
  insert: (author, text, token, guestId) => q.insert.run(author, text, token || null, guestId || null),
  byToken: token => q.byToken.all(token),
  latest: limit => q.latest.all(limit),
  remove: id => q.remove.run(id),
  count: () => q.count.get().n,
};
