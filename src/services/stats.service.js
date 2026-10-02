const rsvps = require('../repositories/rsvp.repository');
const messages = require('../repositories/message.repository');

const summary = () => ({ ...rsvps.counts(), messages: messages.count(), pending: rsvps.countPendingGuests() });
module.exports = { summary };
