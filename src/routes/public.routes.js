const router = require('express').Router();
const config = require('../config');
const createRateLimiter = require('../middleware/rateLimit');
const guest = require('../controllers/guest.controller');
const rsvp = require('../controllers/rsvp.controller');
const message = require('../controllers/message.controller');

const writeLimit = createRateLimiter({ max: config.limits.writesPerMinute });

router.get('/guest/:token', guest.show);
router.post('/rsvp', writeLimit, rsvp.submit);
router.get('/messages', message.index);
router.post('/messages', writeLimit, message.create);

module.exports = router;
