const db = require('../database/connection');

const q = {
  insert: db.prepare('INSERT INTO messages (author, text) VALUES (?, ?)'),
  latest: db.prepare('SELECT id, author, text, created_at FROM messages ORDER BY id DESC LIMIT ?'),
  remove: db.prepare('DELETE FROM messages WHERE id = ?'),
  count: db.prepare('SELECT COUNT(*) AS n FROM messages'),
};

module.exports = {
  insert: (author, text) => q.insert.run(author, text),
  latest: limit => q.latest.all(limit),
  remove: id => q.remove.run(id),
  count: () => q.count.get().n,
};
