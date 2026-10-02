const rsvpService = require('../services/rsvp.service');
exports.submit = (req, res) => { rsvpService.submit(req.body); res.json({ ok: true }); };
