const messageService = require('../services/message.service');
exports.index = (req, res) => res.json(messageService.listPublic());
exports.create = (req, res) => { messageService.create(req.body); res.json({ ok: true }); };
