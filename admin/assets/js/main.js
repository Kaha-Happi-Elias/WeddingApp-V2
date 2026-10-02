import { adminApi } from './api.js';
import { rsvpRow, messageRow, guestRow } from './views.js';

const $ = id => document.getElementById(id);
const data = { rsvps: [], messages: [], guests: [] };
let tab = 'all';

function showSummary(s) {
  $('sAcc').textContent = s.accepted; $('sSeats').textContent = s.seats; $('sDec').textContent = s.declined;
  $('sPen').textContent = s.pending; $('sMsg').textContent = s.messages;
}

async function load() {
  try {
    const { summary, ...lists } = await adminApi.loadAll();
    Object.assign(data, lists);
    showSummary(summary);
    render();
  } catch (e) { $('list').innerHTML = '<div class="empty">Impossible de charger les données.</div>'; }
}

/** Runs an API action then reloads the data. */
const act = fn => async id => { await fn(id); load(); };

function render() {
  const term = $('search').value.trim().toLowerCase();
  const list = $('list');
  list.innerHTML = '';
  let rows;
  if (tab === 'messages') {
    rows = data.messages.filter(m => (m.author + ' ' + m.text).toLowerCase().includes(term)).map(m => messageRow(m, act(adminApi.deleteMessage)));
  } else if (tab === 'guests') {
    rows = data.guests.filter(g => g.name.toLowerCase().includes(term)).map(g => guestRow(g, act(adminApi.deleteGuest)));
  } else {
    rows = data.rsvps.filter(r => (tab === 'all' || r.status === tab) && r.name.toLowerCase().includes(term)).map(r => rsvpRow(r, act(adminApi.deleteRsvp)));
  }
  if (rows.length) list.append(...rows);
  else list.innerHTML = '<div class="empty">Rien à afficher pour le moment.</div>';
}

document.querySelectorAll('.tab').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
    button.classList.add('on');
    tab = button.dataset.t;
    $('addBox').hidden = tab !== 'guests';
    render();
  };
});
$('search').oninput = render;
$('addBtn').onclick = async () => {
  const names = $('names').value;
  if (!names.trim()) return;
  try { await adminApi.createGuests(names); $('names').value = ''; load(); }
  catch (e) { alert('Impossible de créer les liens.'); }
};

load();
setInterval(load, 30000);   // refresh every 30 s
