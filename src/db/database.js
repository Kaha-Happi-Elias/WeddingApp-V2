const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'wedding.db');

/* ── Bootstrap ──────────────────────────────────────────────────────────── */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/* ── Schema ─────────────────────────────────────────────────────────────── */
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  CREATE TABLE IF NOT EXISTS rsvps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    name_key   TEXT NOT NULL UNIQUE,
    status     TEXT NOT NULL CHECK (status IN ('accepted','declined')),
    guest_id   INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    author     TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
`);

/* ── Migrations (idempotent) ─────────────────────────────────────────────── */
const addCol = (table, col, def) => {
  const exists = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === col);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
};

addCol('rsvps',   'guest_id',    'INTEGER');
addCol('rsvps',   'phone',       'TEXT');
addCol('rsvps',   'seats',       'INTEGER DEFAULT 1');
addCol('rsvps',   'note',        'TEXT');
addCol('guests',  'table_label', 'TEXT');

/* ── Prepared statements ─────────────────────────────────────────────────── */
const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

const q = {
  // ── Public ────────────────────────────────────────────────────────────────
  guestByToken: db.prepare(`
    SELECT g.id, g.name, g.table_label, r.status, r.phone, r.seats, r.note
    FROM   guests g
    LEFT JOIN rsvps r ON r.guest_id = g.id
    WHERE  g.token = ?`),

  upsertRsvp: db.prepare(`
    INSERT INTO rsvps (name, name_key, status, guest_id, phone, seats, note)
      VALUES (@name, @key, @status, @guestId, @phone, @seats, @note)
    ON CONFLICT(name_key) DO UPDATE SET
      name       = excluded.name,
      status     = excluded.status,
      phone      = excluded.phone,
      seats      = excluded.seats,
      note       = excluded.note,
      updated_at = ${NOW}`),

  addMessage:    db.prepare('INSERT INTO messages (author, text) VALUES (?, ?)'),
  listMessages:  db.prepare('SELECT id, author, text, created_at FROM messages ORDER BY id DESC LIMIT ?'),

  // ── Admin ─────────────────────────────────────────────────────────────────
  deleteMessage: db.prepare('DELETE FROM messages WHERE id = ?'),

  listRsvps: db.prepare(`
    SELECT r.id, r.name, r.status, r.phone, r.seats, r.note,
           r.created_at, r.updated_at, g.table_label
    FROM   rsvps r
    LEFT JOIN guests g ON g.id = r.guest_id
    ORDER BY r.updated_at DESC`),

  deleteRsvp: db.prepare('DELETE FROM rsvps WHERE id = ?'),

  counts: db.prepare(`
    SELECT
      COALESCE(SUM(status='accepted'),          0) AS accepted,
      COALESCE(SUM(status='declined'),          0) AS declined,
      COALESCE(SUM(CASE WHEN status='accepted' THEN seats END), 0) AS seats,
      COUNT(*) AS total
    FROM rsvps`),

  countMessages: db.prepare('SELECT COUNT(*) AS n FROM messages'),
  countPending:  db.prepare(`
    SELECT COUNT(*) AS n
    FROM   guests g
    LEFT JOIN rsvps r ON r.guest_id = g.id
    WHERE  r.id IS NULL`),

  listGuests: db.prepare(`
    SELECT g.id, g.name, g.token, g.table_label, g.created_at, r.status
    FROM   guests g
    LEFT JOIN rsvps r ON r.guest_id = g.id
    ORDER BY g.name COLLATE NOCASE`),

  addGuest:       db.prepare('INSERT INTO guests (token, name, table_label) VALUES (?, ?, ?)'),
  deleteGuestRsvp:db.prepare('DELETE FROM rsvps WHERE guest_id = ?'),
  deleteGuest:    db.prepare('DELETE FROM guests WHERE id = ?'),
};

/* ── Transactions ────────────────────────────────────────────────────────── */

/**
 * Delete a guest and their RSVP atomically.
 * @param {number} id Guest row id.
 */
const removeGuest = db.transaction((id) => {
  q.deleteGuestRsvp.run(id);
  q.deleteGuest.run(id);
});

/**
 * Insert multiple guests and return their tokens.
 * @param {{ name: string, table: string|null }[]} names
 * @returns {{ name: string, token: string }[]}
 */
const addGuests = db.transaction((names) =>
  names.map((n) => {
    const token = crypto.randomBytes(9).toString('base64url'); // 12 unguessable chars
    q.addGuest.run(token, n.name, n.table);
    return { name: n.name, token };
  })
);

module.exports = { db, q, removeGuest, addGuests };
