// Run with: npm test   (uses an in-memory database, nothing is written to disk)
process.env.DB_PATH = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');

const guestService = require('../src/services/guest.service');
const rsvpService = require('../src/services/rsvp.service');
const messageService = require('../src/services/message.service');
const stats = require('../src/services/stats.service');
const exportService = require('../src/services/export.service');

test('creates personal links, with an optional table', () => {
  const created = guestService.createMany('Julie Mbala | Taittinger\nLouis Kabongo\n\n');
  assert.equal(created.length, 2);
  assert.equal(created[0].token.length, 12);
  const profile = guestService.getPublicProfile(created[0].token);
  assert.equal(profile.name, 'Julie Mbala');
  assert.equal(profile.table, 'Taittinger');
  assert.equal(profile.status, null);
  assert.match(profile.code, /^G\d{3}$/);
});

test('an unknown link is rejected', () => {
  assert.throws(() => guestService.getPublicProfile('nope'), { status: 404 });
});

test('a guest answers from the personal link and can change their answer', () => {
  const [{ token }] = guestService.createMany('Marie-Ange');
  rsvpService.submit({ token, status: 'accepted', seats: '3', phone: '690000000', note: 'Sans gluten' });
  let p = guestService.getPublicProfile(token);
  assert.deepEqual([p.status, p.seats, p.phone, p.note], ['accepted', 3, '690000000', 'Sans gluten']);
  rsvpService.submit({ token, status: 'declined' });
  p = guestService.getPublicProfile(token);
  assert.equal(p.status, 'declined');
  assert.equal(p.seats, 1);   // the profile always offers at least 1 seat if they change their mind
});

test('validates answers', () => {
  assert.throws(() => rsvpService.submit({ name: 'X', status: 'maybe' }), { status: 400 });
  assert.throws(() => rsvpService.submit({ name: '  ', status: 'accepted' }), { status: 400 });
  assert.throws(() => rsvpService.submit({ token: 'nope', status: 'accepted' }), { status: 404 });
});

test('open link: same name (any case) updates the same answer', () => {
  const before = rsvpService.list().length;
  rsvpService.submit({ name: 'Paul Ndi', status: 'accepted', seats: 99 });
  rsvpService.submit({ name: 'paul ndi', status: 'declined' });
  assert.equal(rsvpService.list().length, before + 1);
});

test('messages are signed with the real name of a personal link', () => {
  const [{ token }] = guestService.createMany('Sarah-Jane');
  messageService.create({ author: 'Someone else', text: '  Bravo !  ', token });
  assert.equal(messageService.listPublic()[0].author, 'Sarah-Jane');
  assert.equal(messageService.listPublic()[0].text, 'Bravo !');
  assert.throws(() => messageService.create({ text: '   ' }), { status: 400 });
});

test('stats and CSV include pending guests; deleting a guest removes the answer', () => {
  guestService.createMany('Waiting Guest');
  rsvpService.submit({ name: 'Accepted One', status: 'accepted', seats: 2 });
  const s = stats.summary();
  assert.ok(s.pending >= 1 && s.accepted >= 1 && s.seats >= 2 && s.messages >= 1);
  const csv = exportService.guestListCsv();
  assert.match(csv, /En attente/);
  const g = guestService.list().find(x => x.name === 'Marie-Ange');
  guestService.remove(g.id);
  assert.equal(guestService.list().some(x => x.name === 'Marie-Ange'), false);
  assert.equal(rsvpService.list().some(r => r.name === 'Marie-Ange'), false);
});

test('CSV cells are protected against formula injection', () => {
  rsvpService.submit({ name: '=HYPERLINK("x")', status: 'accepted' });
  assert.match(exportService.guestListCsv(), /"'=HYPERLINK/);
});
