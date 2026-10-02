import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { api } from '../services/api.js';
import { toast } from '../ui/toast.js';

const shortDate = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export async function loadMessages() {
  try {
    const list = await api.getMessages();
    $('count').textContent = list.length + (list.length > 1 ? ' messages' : ' message');
    $('msgs').innerHTML = '';
    list.forEach(m => {
      const card = document.createElement('div'); card.className = 'msg';
      const quote = document.createElement('q'); quote.textContent = m.text;          // textContent: no HTML injection
      const row = document.createElement('div');
      const author = document.createElement('span'); author.textContent = m.author;
      const date = document.createElement('small'); date.textContent = shortDate(m.created_at);
      row.append(author, date); card.append(quote, row); $('msgs').append(card);
    });
  } catch (e) { $('count').textContent = ''; }
}

export function initGuestbook() {
  $('send').onclick = async e => {
    const button = e.currentTarget, text = $('msg').value.trim();
    if (!text) { toast('Écrivez un message'); return; }
    button.disabled = true;
    try {
      await api.postMessage({ author: $('fname').value.trim() || state.guest.name || 'Invité', text, token: state.token });
      $('msg').value = '';
      toast("Message envoyé au livre d'or ✨");
      loadMessages();
    } catch (err) { toast(err.message); }
    button.disabled = false;
  };
}
