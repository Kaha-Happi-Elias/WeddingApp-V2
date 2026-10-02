/** Builds the DOM rows of the dashboard lists (text is always set with textContent). */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const fmt = iso => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUS_LABEL = { accepted: 'Présent', declined: 'Absent' };

function deleteButton(label, onClick) {
  const b = el('button', 'del', '×');
  b.title = 'Supprimer';
  b.setAttribute('aria-label', label);
  b.onclick = onClick;
  return b;
}
const row = (...children) => { const r = el('div', 'row'); r.append(...children); return r; };
const pill = (status) => el('span', 'pill ' + (status || 'pending'), STATUS_LABEL[status] || 'En attente');

export function rsvpRow(r, onDelete) {
  const main = el('div', 'main');
  const details = [r.status === 'accepted' ? (r.seats || 1) + ' place(s)' : '', r.phone, r.table_label ? 'Table ' + r.table_label : '', fmt(r.updated_at)];
  main.append(el('div', 'name', r.name), el('div', 'meta', details.filter(Boolean).join(' · ')));
  if (r.note) { const note = el('div', 'txt', '“' + r.note + '”'); note.style.fontSize = '14px'; main.append(note); }
  return row(main, pill(r.status), deleteButton('Supprimer la réponse', () => confirm('Supprimer la réponse de ' + r.name + ' ?') && onDelete(r.id)));
}

export function messageRow(m, onDelete) {
  const main = el('div', 'main');
  main.append(el('div', 'name', m.author), el('div', 'txt', '“' + m.text + '”'), el('div', 'meta', fmt(m.created_at)));
  return row(main, deleteButton('Supprimer le message', () => confirm('Supprimer ce message ?') && onDelete(m.id)));
}

export function guestRow(g, onDelete) {
  const link = location.origin + '/?g=' + g.token;
  const main = el('div', 'main');
  const actions = el('div', 'acts');

  const copy = el('button', 'mini', 'Copier le lien');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(link); copy.textContent = 'Copié ✓'; setTimeout(() => { copy.textContent = 'Copier le lien'; }, 1800); }
    catch (e) { prompt('Copiez ce lien :', link); }
  };
  const whatsapp = el('a', 'mini', 'WhatsApp');
  whatsapp.target = '_blank'; whatsapp.rel = 'noopener';
  whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent('Bonjour ' + g.name + ', voici votre invitation personnelle à notre mariage : ' + link);
  actions.append(copy, whatsapp);

  main.append(el('div', 'name', g.name + (g.table_label ? '  ·  Table ' + g.table_label : '')), actions);
  return row(main, pill(g.status), deleteButton("Supprimer l'invité", () => confirm('Supprimer ' + g.name + ' et son lien ?') && onDelete(g.id)));
}
