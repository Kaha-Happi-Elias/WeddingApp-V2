const path             = require('path');
const { Router }       = require('express');
const { q, removeGuest, addGuests } = require('../db/database');
const { auth }         = require('../middleware/auth');
const { clean }        = require('../utils/sanitize');

const router = Router();

// Every route in this file is protected by HTTP Basic Auth
router.use(auth);

/* ── GET /api/admin/summary ──────────────────────────────────────────────── */
router.get('/summary', (req, res) => {
  res.json({
    ...q.counts.get(),
    messages: q.countMessages.get().n,
    pending:  q.countPending.get().n,
  });
});

/* ── GET /api/admin/rsvps ────────────────────────────────────────────────── */
router.get('/rsvps', (req, res) => {
  res.json(q.listRsvps.all());
});

/* ── DELETE /api/admin/rsvps/:id ─────────────────────────────────────────── */
router.delete('/rsvps/:id', (req, res) => {
  q.deleteRsvp.run(req.params.id);
  res.json({ ok: true });
});

/* ── GET /api/admin/rsvps.csv ────────────────────────────────────────────── */
router.get('/rsvps.csv', (req, res) => {
  /**
   * Wrap a cell value in double-quotes and escape internal quotes.
   * Also blocks spreadsheet formula injection (=, +, -, @).
   */
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;      // block formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };

  const label = { accepted: 'Accepté', declined: 'Décliné' };

  const rows = [
    ['Nom', 'Réponse', 'Places', 'Téléphone', 'Table', 'Note', 'Date'],
    ...q.listRsvps.all().map((r) => [
      r.name, label[r.status], r.seats, r.phone, r.table_label, r.note, r.updated_at,
    ]),
    // Guests who were invited via personal link but haven't replied yet
    ...q.listGuests.all()
      .filter((g) => !g.status)
      .map((g) => [g.name, 'En attente', '', '', g.table_label, '', '']),
  ];

  res.set({
    'Content-Type':        'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="invites.csv"',
  });
  res.send('\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n'));
});

/* ── GET /api/admin/messages ─────────────────────────────────────────────── */
router.get('/messages', (req, res) => {
  res.json(q.listMessages.all(10_000));
});

/* ── DELETE /api/admin/messages/:id ──────────────────────────────────────── */
router.delete('/messages/:id', (req, res) => {
  q.deleteMessage.run(req.params.id);
  res.json({ ok: true });
});

/* ── GET /api/admin/guests ───────────────────────────────────────────────── */
router.get('/guests', (req, res) => {
  res.json(q.listGuests.all());
});

/* ── POST /api/admin/guests ──────────────────────────────────────────────── */
router.post('/guests', (req, res) => {
  // Accept either a JSON array or a newline-separated string
  const raw = Array.isArray(req.body.names)
    ? req.body.names
    : String(req.body.names || '').split(/\r?\n/);

  const names = raw
    .map((line) => {
      const [n, t] = String(line).split(/[|;]/);
      return { name: clean(n, 80), table: clean(t, 40) || null };
    })
    .filter((x) => x.name)
    .slice(0, 500);

  if (!names.length) return res.status(400).json({ error: 'Aucun nom' });

  res.json({ created: addGuests(names) });
});

/* ── DELETE /api/admin/guests/:id ────────────────────────────────────────── */
router.delete('/guests/:id', (req, res) => {
  removeGuest(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
