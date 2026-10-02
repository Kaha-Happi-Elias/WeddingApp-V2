require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'wedding.db');

if (ADMIN_PASSWORD === 'changeme') {
  console.warn('⚠️  ADMIN_PASSWORD is not set in .env — anyone could guess it. Change it!');
}

/* ---------- Database (created automatically on first start) ---------- */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT NOT NULL UNIQUE,            -- secret part of the personal link
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE TABLE IF NOT EXISTS rsvps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    name_key   TEXT NOT NULL UNIQUE,            -- one answer per guest ("guest:<id>" for personal links)
    status     TEXT NOT NULL CHECK (status IN ('accepted','declined')),
    guest_id   INTEGER,                         -- set when the answer came from a personal link
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
// Upgrade an older database (from the first version) that has no guest_id column
const addCol = (table, col, def) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
};
addCol('rsvps', 'guest_id', 'INTEGER');
addCol('rsvps', 'phone', 'TEXT');
addCol('rsvps', 'seats', 'INTEGER DEFAULT 1');
addCol('rsvps', 'note', 'TEXT');
addCol('guests', 'table_label', 'TEXT');

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";
const q = {
  upsertRsvp: db.prepare(`
    INSERT INTO rsvps (name, name_key, status, guest_id, phone, seats, note) VALUES (@name, @key, @status, @guestId, @phone, @seats, @note)
    ON CONFLICT(name_key) DO UPDATE SET
      name = excluded.name, status = excluded.status, phone = excluded.phone, seats = excluded.seats,
      note = excluded.note, updated_at = ${NOW}`),
  addMessage: db.prepare('INSERT INTO messages (author, text) VALUES (?, ?)'),
  listMessages: db.prepare('SELECT id, author, text, created_at FROM messages ORDER BY id DESC LIMIT ?'),
  deleteMessage: db.prepare('DELETE FROM messages WHERE id = ?'),
  listRsvps: db.prepare(`SELECT r.id, r.name, r.status, r.phone, r.seats, r.note, r.created_at, r.updated_at, g.table_label
    FROM rsvps r LEFT JOIN guests g ON g.id = r.guest_id ORDER BY r.updated_at DESC`),
  deleteRsvp: db.prepare('DELETE FROM rsvps WHERE id = ?'),
  counts: db.prepare(`SELECT
    COALESCE(SUM(status='accepted'),0) AS accepted,
    COALESCE(SUM(status='declined'),0) AS declined,
    COALESCE(SUM(CASE WHEN status='accepted' THEN seats END),0) AS seats,
    COUNT(*) AS total FROM rsvps`),
  countMessages: db.prepare('SELECT COUNT(*) AS n FROM messages'),
  countPending: db.prepare('SELECT COUNT(*) AS n FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE r.id IS NULL'),
  // personal links
  guestByToken: db.prepare('SELECT g.id, g.name, g.table_label, r.status, r.phone, r.seats, r.note FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id WHERE g.token = ?'),
  listGuests: db.prepare(`SELECT g.id, g.name, g.token, g.table_label, g.created_at, r.status
    FROM guests g LEFT JOIN rsvps r ON r.guest_id = g.id ORDER BY g.name COLLATE NOCASE`),
  addGuest: db.prepare('INSERT INTO guests (token, name, table_label) VALUES (?, ?, ?)'),
  deleteGuestRsvp: db.prepare('DELETE FROM rsvps WHERE guest_id = ?'),
  deleteGuest: db.prepare('DELETE FROM guests WHERE id = ?'),
};
const removeGuest = db.transaction(id => { q.deleteGuestRsvp.run(id); q.deleteGuest.run(id); });
const addGuests = db.transaction(names => names.map(n => {
  const token = crypto.randomBytes(9).toString('base64url');   // 12 unguessable characters
  q.addGuest.run(token, n.name, n.table);
  return { name: n.name, token };
}));

/* ---------- App ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }));

// very small anti-spam limiter: 20 writes / minute / IP
const hits = new Map();
function limiter(req, res, next) {
  const now = Date.now();
  const arr = (hits.get(req.ip) || []).filter(t => now - t < 60000);
  if (arr.length >= 20) return res.status(429).json({ error: 'Trop de requêtes, réessayez dans une minute.' });
  arr.push(now); hits.set(req.ip, arr); next();
}

const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ---------- Public API (used by the guest page) ---------- */
// Who is behind a personal link?
app.get('/api/guest/:token', (req, res) => {
  const g = q.guestByToken.get(String(req.params.token).slice(0, 40));
  if (!g) return res.status(404).json({ error: 'Lien invalide' });
  res.json({ name: g.name, status: g.status || null, table: g.table_label || null, phone: g.phone || '', seats: g.seats || 1,
             note: g.note || '', code: 'G' + String(g.id).padStart(3, '0') });
});

app.post('/api/rsvp', limiter, (req, res) => {
  const status = req.body.status;
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const extra = {
    phone: clean(req.body.phone, 30), note: clean(req.body.note, 300),
    seats: status === 'accepted' ? Math.min(10, Math.max(1, parseInt(req.body.seats, 10) || 1)) : 0,
  };

  if (req.body.token) {                                   // personal link: name comes from the database
    const g = q.guestByToken.get(String(req.body.token).slice(0, 40));
    if (!g) return res.status(404).json({ error: 'Lien invalide' });
    q.upsertRsvp.run({ name: g.name, key: 'guest:' + g.id, status, guestId: g.id, ...extra });
    return res.json({ ok: true });
  }
  const name = clean(req.body.name, 80);                  // open link: guest types their name
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  q.upsertRsvp.run({ name, key: name.toLowerCase(), status, guestId: null, ...extra });
  res.json({ ok: true });
});

app.get('/api/messages', (req, res) => res.json(q.listMessages.all(200)));

app.post('/api/messages', limiter, (req, res) => {
  let author = clean(req.body.author, 80) || 'Invité';
  if (req.body.token) {
    const g = q.guestByToken.get(String(req.body.token).slice(0, 40));
    if (g) author = g.name;                               // can't be faked from the browser
  }
  const text = clean(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Message vide' });
  q.addMessage.run(author, text);
  res.json({ ok: true });
});

/* ---------- Admin (protected by username + password) ---------- */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function auth(req, res, next) {
  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const i = decoded.indexOf(':');
    if (safeEqual(decoded.slice(0, i), ADMIN_USER) && safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Espace des mariés"').status(401).send('Accès réservé aux mariés.');
}

app.get('/admin', auth, (req, res) => res.sendFile(path.join(__dirname, 'admin', 'admin.html')));

app.get('/api/admin/summary', auth, (req, res) =>
  res.json({ ...q.counts.get(), messages: q.countMessages.get().n, pending: q.countPending.get().n }));
app.get('/api/admin/rsvps', auth, (req, res) => res.json(q.listRsvps.all()));
app.get('/api/admin/messages', auth, (req, res) => res.json(q.listMessages.all(10000)));
app.delete('/api/admin/messages/:id', auth, (req, res) => { q.deleteMessage.run(req.params.id); res.json({ ok: true }); });
app.delete('/api/admin/rsvps/:id', auth, (req, res) => { q.deleteRsvp.run(req.params.id); res.json({ ok: true }); });

// Personal links
app.get('/api/admin/guests', auth, (req, res) => res.json(q.listGuests.all()));
app.post('/api/admin/guests', auth, (req, res) => {
  const raw = Array.isArray(req.body.names) ? req.body.names : String(req.body.names || '').split(/\r?\n/);
  const names = raw.map(line => {
    const [n, t] = String(line).split(/[|;]/);
    return { name: clean(n, 80), table: clean(t, 40) || null };
  }).filter(x => x.name).slice(0, 500);
  if (!names.length) return res.status(400).json({ error: 'Aucun nom' });
  res.json({ created: addGuests(names) });
});
app.delete('/api/admin/guests/:id', auth, (req, res) => { removeGuest(req.params.id); res.json({ ok: true }); });

app.get('/api/admin/rsvps.csv', auth, (req, res) => {
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;           // block spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const label = { accepted: 'Accepté', declined: 'Décliné' };
  const rows = [['Nom', 'Réponse', 'Places', 'Téléphone', 'Table', 'Note', 'Date']]
    .concat(q.listRsvps.all().map(r => [r.name, label[r.status], r.seats, r.phone, r.table_label, r.note, r.updated_at]))
    .concat(q.listGuests.all().filter(g => !g.status).map(g => [g.name, 'En attente', '', '', g.table_label, '', '']));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="invites.csv"' });
  res.send('\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n'));
});

/* ---------- Guest page (static files) ---------- */
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✅ Invitation:  http://localhost:${PORT}`);
  console.log(`🔐 Espace mariés: http://localhost:${PORT}/admin`);
});
