const stats = require('../services/stats.service');
const rsvpService = require('../services/rsvp.service');
const messageService = require('../services/message.service');
const guestService = require('../services/guest.service');
const exportService = require('../services/export.service');

const ok = res => res.json({ ok: true });

exports.summary = (req, res) => res.json(stats.summary());

exports.rsvps = (req, res) => res.json(rsvpService.list());
exports.deleteRsvp = (req, res) => { rsvpService.remove(req.params.id); ok(res); };

exports.messages = (req, res) => res.json(messageService.listAll());
exports.deleteMessage = (req, res) => { messageService.remove(req.params.id); ok(res); };

exports.guests = (req, res) => res.json(guestService.list());
exports.createGuests = (req, res) => res.json({ created: guestService.createMany(req.body.names) });
exports.deleteGuest = (req, res) => { guestService.remove(req.params.id); ok(res); };

exports.exportCsv = (req, res) => {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="invites.csv"' });
  res.send(exportService.guestListCsv());
};
