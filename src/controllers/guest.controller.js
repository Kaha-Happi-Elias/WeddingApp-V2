const guestService = require('../services/guest.service');
exports.show = (req, res) => res.json(guestService.getPublicProfile(req.params.token));
