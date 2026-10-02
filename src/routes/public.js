const { Router } = require('express');
const { q }       = require('../db/database');
const { limiter } = require('../middleware/limiter');
const { clean }   = require('../utils/sanitize');

const router = Router();

/* ── GET /api/guest/:token ──────────────────────────────────────────────────
   Resolve a personal invite link and return the guest's data.
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/guest/:token', (req, res) => {
  const g = q.guestByToken.get(String(req.params.token).slice(0, 40));
  if (!g) return res.status(404).json({ error: 'Lien invalide' });

  res.json({
    name:   g.name,
    status: g.status  || null,
    table:  g.table_label || null,
    phone:  g.phone   || '',
    seats:  g.seats   || 1,
    note:   g.note    || '',
    code:   'G' + String(g.id).padStart(3, '0'),
  });
});

/* ── POST /api/rsvp ─────────────────────────────────────────────────────────
   Submit or update an RSVP.  Accepts both personal-link guests (token) and
   open-link guests (name typed manually).
   ─────────────────────────────────────────────────────────────────────────── */
router.post('/rsvp', limiter, (req, res) => {
  const { status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const extra = {
    phone: clean(req.body.phone, 30),
    note:  clean(req.body.note,  300),
    seats: status === 'accepted'
      ? Math.min(10, Math.max(1, parseInt(req.body.seats, 10) || 1))
      : 0,
  };

  // Personal link — name comes from the database, cannot be spoofed
  if (req.body.token) {
    const g = q.guestByToken.get(String(req.body.token).slice(0, 40));
    if (!g) return res.status(404).json({ error: 'Lien invalide' });

    q.upsertRsvp.run({ name: g.name, key: 'guest:' + g.id, status, guestId: g.id, ...extra });
    return res.json({ ok: true });
  }

  // Open link — guest types their own name
  const name = clean(req.body.name, 80);
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  q.upsertRsvp.run({ name, key: name.toLowerCase(), status, guestId: null, ...extra });
  res.json({ ok: true });
});

/* ── GET /api/messages ──────────────────────────────────────────────────────
   Fetch the latest 200 guestbook messages.
   ─────────────────────────────────────────────────────────────────────────── */
router.get('/messages', (req, res) => {
  res.json(q.listMessages.all(200));
});

/* ── POST /api/messages ─────────────────────────────────────────────────────
   Post a new guestbook message.  If a valid token is provided the author name
   is taken from the DB (cannot be faked from the browser).
   ─────────────────────────────────────────────────────────────────────────── */
router.post('/messages', limiter, (req, res) => {
  let author = clean(req.body.author, 80) || 'Invité';

  if (req.body.token) {
    const g = q.guestByToken.get(String(req.body.token).slice(0, 40));
    if (g) author = g.name;
  }

  const text = clean(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Message vide' });

  q.addMessage.run(author, text);
  res.json({ ok: true });
});

module.exports = router;
