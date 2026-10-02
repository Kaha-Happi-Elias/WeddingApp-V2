const router = require('express').Router();
const admin = require('../controllers/admin.controller');

router.get('/summary', admin.summary);
router.get('/rsvps', admin.rsvps);
router.get('/rsvps.csv', admin.exportCsv);
router.delete('/rsvps/:id', admin.deleteRsvp);
router.get('/messages', admin.messages);
router.delete('/messages/:id', admin.deleteMessage);
router.get('/guests', admin.guests);
router.post('/guests', admin.createGuests);
router.delete('/guests/:id', admin.deleteGuest);

module.exports = router;
