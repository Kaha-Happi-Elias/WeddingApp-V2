import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { store } from '../utils/storage.js';
import { api } from '../services/api.js';
import { toast } from '../ui/toast.js';
import { drawQR } from './qr.js';
import { MAX_SEATS } from '../config.js';

let seats = 1;
const attendance = () => (document.querySelector('input[name=att]:checked') || {}).value;

function setSeats(n) {
  seats = Math.min(MAX_SEATS, Math.max(1, n));
  $('seats').textContent = seats;
  $('minus').disabled = seats <= 1;
  $('plus').disabled = seats >= MAX_SEATS;
}

/** Locks the form once the guest has answered ("Réponse déjà enregistrée"). */
function lockForm(on) {
  ['fname', 'fphone', 'fnote'].forEach(id => { $(id).disabled = on || (id === 'fname' && !!state.token); });
  document.querySelectorAll('input[name=att]').forEach(r => { r.disabled = on; });
  $('minus').disabled = on || seats <= 1;
  $('plus').disabled = on || seats >= MAX_SEATS;
  $('submit').disabled = on;
  $('submit').textContent = on ? 'RÉPONSE DÉJÀ ENREGISTRÉE' : 'ENVOYER MA RÉPONSE';
  $('done').hidden = !on;
  $('edit').hidden = !on;
}

/** Paints the whole page from state.guest. */
export function renderGuest() {
  const g = state.guest;
  $('fname').value = g.name || '';
  $('fphone').value = g.phone || '';
  $('fnote').value = g.note || '';
  $('gname').textContent = g.name ? g.name : 'Cher(e) invité(e)';
  if (g.table) { $('tbl').hidden = false; $('tbl').textContent = '★ NUMÉRO DE TABLE : ' + g.table; }
  document.querySelectorAll('input[name=att]').forEach(r => { r.checked = r.value === g.status; });
  setSeats(g.seats || 1);
  $('seatsBox').hidden = g.status !== 'accepted';
  lockForm(!!g.status);

  const accepted = g.status === 'accepted';       // the QR code and ticket are only for guests who confirmed
  $('passSec').hidden = !accepted;
  if (accepted) {
    $('pname').textContent = g.name;
    $('pcode').textContent = g.code ? 'Code : ' + g.code : '';
    drawQR();
    $('passSec').classList.add('in');
  }
}

async function submit(e) {
  const name = $('fname').value.trim();
  const status = attendance();
  if (!name) { toast('Indiquez votre nom complet'); $('fname').focus(); return; }
  if (!status) { toast('Dites-nous si vous serez présent(e)'); return; }
  e.currentTarget.disabled = true;
  try {
    await api.saveRsvp({ name, status, phone: $('fphone').value, seats, note: $('fnote').value, token: state.token });
    state.guest = {
      ...state.guest, name: state.token ? state.guest.name : name, status,
      phone: $('fphone').value, seats: status === 'accepted' ? seats : 0, note: $('fnote').value,
    };
    if (!state.token) store.set('guest', state.guest);
    renderGuest();
    if (status === 'accepted') {
      toast('Merci ! Votre billet est prêt 🎉');
      setTimeout(() => $('passSec').scrollIntoView({ behavior: 'smooth', block: 'center' }), 700);
    } else toast('Réponse enregistrée');
  } catch (err) { toast(err.message); $('submit').disabled = false; }
}

export function initRsvp() {
  document.querySelectorAll('input[name=att]').forEach(r => { r.onchange = () => { $('seatsBox').hidden = attendance() !== 'accepted'; }; });
  $('minus').onclick = () => setSeats(seats - 1);
  $('plus').onclick = () => setSeats(seats + 1);
  $('edit').onclick = () => lockForm(false);
  $('submit').onclick = submit;
}

/** With a personal link (?g=...), loads the guest's name, table and previous answer from the server. */
export async function loadGuest() {
  if (!state.token) return;
  try {
    const g = await api.getGuest(state.token);
    state.guest = { name: g.name, status: g.status || '', phone: g.phone, seats: g.seats, note: g.note, table: g.table, code: g.code };
    renderGuest();
  } catch (e) { state.token = null; toast("Ce lien d'invitation n'est pas valide."); }
}
