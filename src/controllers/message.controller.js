const messageService = require('../services/message.service');
exports.index = (req, res) => res.json(messageService.listPublic(req.query.token));
exports.create = (req, res) => { messageService.create(req.body); res.json({ ok: true }); };
