/* ==========================================================================
   Wedding Invitation — Guest Page Script
   public/js/script.js
   ========================================================================== */

/* ── Config (edit these to match your event) ───────────────────────────── */
/** ISO datetime of the first event (town-hall ceremony). */
const WEDDING_DATE = '2026-11-07T09:30:00+01:00';

/** Background image used when generating the PDF ticket. */
const TICKET = { bg: 'ticket-bg.jpg' };
/* ========================================================================== */


/* ── Utility helpers ───────────────────────────────────────────────────── */

/** Shorthand for document.getElementById. */
const $ = (id) => document.getElementById(id);

/** Simple toast notification. Auto-hides after 2.8 s. */
let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

/** Safe localStorage wrapper — silently ignores errors (private browsing etc.). */
const store = {
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
  },
};

/**
 * Thin fetch wrapper that throws on non-2xx responses, surfacing the API's
 * own error message when available.
 */
async function api(url, method = 'GET', body) {
  const res  = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur, veuillez réessayer.');
  return data;
}


/* ── Countdown timer ───────────────────────────────────────────────────── */
const weddingTarget = new Date(WEDDING_DATE);

function tickCountdown() {
  const totalSeconds = Math.max(0, weddingTarget - Date.now()) / 1000 | 0;
  const pad = (n, width) => String(n).padStart(width, '0');

  $('d').textContent = pad(totalSeconds / 86400 | 0,         3);
  $('h').textContent = pad(totalSeconds % 86400 / 3600 | 0,  2);
  $('m').textContent = pad(totalSeconds % 3600  / 60   | 0,  2);
  $('s').textContent = pad(totalSeconds % 60,                 2);
}

tickCountdown();
setInterval(tickCountdown, 1000);


/* ── Google Calendar link ──────────────────────────────────────────────── */
$('cal').href =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text='     + encodeURIComponent('Mariage Irène & Benjamin') +
  '&dates=20261107T093000Z/20261107T213000Z' +
  '&location=' + encodeURIComponent('Foyer du Marin, 10 Rue Gallieni, Douala') +
  '&details='  + encodeURIComponent(
    'Mairie à 09h30 (Foyer du Marin). ' +
    'Réception à 18h00 (Complexe Émirates, salle VIP, Deido). ' +
    'Dress code : Chic & Élégant.'
  );


/* ── Background music ──────────────────────────────────────────────────── */
const bgm = $('bgm');
let hasMusic = false;

// Probe for the file without downloading it
fetch('music.mp3', { method: 'HEAD' })
  .then((r) => { if (r.ok) { hasMusic = true; bgm.src = 'music.mp3'; } })
  .catch(() => {});

$('music').onclick = () => {
  if (bgm.paused) {
    bgm.play();
    $('music').textContent = '❚❚';
  } else {
    bgm.pause();
    $('music').textContent = '▶';
  }
};


/* ── Splash / page reveal ──────────────────────────────────────────────── */
function revealSections() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
}

$('openBtn').onclick = () => {
  $('splash').classList.add('gone');
  $('site').hidden = false;
  document.body.classList.remove('lock');

  if (hasMusic) {
    bgm.play()
      .then(() => { $('music').hidden = false; })
      .catch(() => {
        // Autoplay blocked — show play button so user can start manually
        $('music').hidden = false;
        $('music').textContent = '▶';
      });
  }

  setTimeout(() => $('splash').remove(), 1000);
  revealSections();
};


/* ── RSVP state ────────────────────────────────────────────────────────── */
/** Personal-link token from the URL (null for open invitations). */
let TOKEN = new URLSearchParams(location.search).get('g');

/** Current guest state (filled from local-storage or API). */
let guest = TOKEN
  ? { name: '', status: '' }
  : store.get('guest', { name: '', status: '' });

let seats  = 1;
let locked = false;

/** Returns the currently-selected attendance radio value (or undefined). */
const getAttendance = () =>
  (document.querySelector('input[name=att]:checked') || {}).value;

/** Update the visible seat counter and stepper button states. */
function setSeats(n) {
  seats = Math.min(2, Math.max(1, n));
  $('seats').textContent   = seats;
  $('minus').disabled      = seats <= 1;
  $('plus').disabled       = seats >= 2;
}

/** Lock or unlock the RSVP form fields. */
function lockForm(on) {
  locked = on;

  ['fname', 'fphone', 'fnote'].forEach((id) => {
    $(id).disabled = on || (id === 'fname' && !!TOKEN);
  });
  document.querySelectorAll('input[name=att]').forEach((r) => r.disabled = on);

  $('minus').disabled   = on || seats <= 1;
  $('plus').disabled    = on || seats >= 10;
  $('submit').disabled  = on;
  $('submit').textContent = on ? 'RÉPONSE DÉJÀ ENREGISTRÉE' : 'ENVOYER MA RÉPONSE';
  $('done').hidden      = !on;
  $('edit').hidden      = !on;
}

/** Sync the entire RSVP form UI to the current `guest` state. */
function renderRsvp() {
  $('fname').value  = guest.name  || '';
  $('fphone').value = guest.phone || '';
  $('fnote').value  = guest.note  || '';

  $('gname').textContent = guest.name ? guest.name : 'Cher(e) invité(e)';

  if (guest.table) {
    $('tbl').hidden      = false;
    $('tbl').textContent = '★ NUMÉRO DE TABLE : ' + guest.table;
  }

  document.querySelectorAll('input[name=att]').forEach((r) => {
    r.checked = r.value === guest.status;
  });

  setSeats(guest.seats || 1);
  $('seatsBox').hidden = guest.status !== 'accepted';
  lockForm(!!guest.status);

  const accepted = guest.status === 'accepted';
  $('passSec').hidden = !accepted;

  if (accepted) {
    $('pname').textContent = guest.name;
    $('pcode').textContent = guest.code ? 'Code : ' + guest.code : '';
    drawQR();
    $('passSec').classList.add('in');
  }
}

/* Show/hide the seats stepper when the radio changes */
document.querySelectorAll('input[name=att]').forEach((r) => {
  r.onchange = () => { $('seatsBox').hidden = getAttendance() !== 'accepted'; };
});

$('minus').onclick = () => setSeats(seats - 1);
$('plus').onclick  = () => setSeats(seats + 1);
$('edit').onclick  = () => lockForm(false);

/** Submit (or update) an RSVP. */
$('submit').onclick = async (e) => {
  const name   = $('fname').value.trim();
  const status = getAttendance();

  if (!name)   { toast('Indiquez votre nom complet'); $('fname').focus(); return; }
  if (!status) { toast('Dites-nous si vous serez présent(e)'); return; }

  e.currentTarget.disabled = true;

  try {
    await api('/api/rsvp', 'POST', {
      name,
      status,
      phone: $('fphone').value,
      seats,
      note:  $('fnote').value,
      token: TOKEN,
    });

    guest = {
      ...guest,
      name:   TOKEN ? guest.name : name,
      status,
      phone:  $('fphone').value,
      seats:  status === 'accepted' ? seats : 0,
      note:   $('fnote').value,
    };

    if (!TOKEN) store.set('guest', guest);

    renderRsvp();

    if (status === 'accepted') {
      toast('Merci ! Votre billet est prêt 🎉');
      setTimeout(() => $('passSec').scrollIntoView({ behavior: 'smooth', block: 'center' }), 700);
    } else {
      toast('Réponse enregistrée');
    }
  } catch (err) {
    toast(err.message);
    e.currentTarget.disabled = false;
  }
};

/** Load guest data from the server when arriving via a personal link. */
async function loadGuest() {
  if (!TOKEN) return;
  try {
    const g = await api('/api/guest/' + encodeURIComponent(TOKEN));
    guest = {
      name:   g.name,
      status: g.status || '',
      phone:  g.phone,
      seats:  g.seats,
      note:   g.note,
      table:  g.table,
      code:   g.code,
    };
    renderRsvp();
  } catch {
    TOKEN = null;
    toast("Ce lien d'invitation n'est pas valide.");
  }
}


/* ── QR code (on-page) ─────────────────────────────────────────────────── */
function drawQR() {
  const qrEl = $('qr');
  qrEl.innerHTML = '';
  if (!window.QRCode) return;

  const text = TOKEN
    ? 'EC-' + TOKEN
    : 'invitation:irene-benjamin:' + (guest.name || 'invite');

  new QRCode(qrEl, {
    text,
    width:      170,
    height:     170,
    colorDark:  '#4a2f7a',
    colorLight: '#ffffff',
  });
}


/* ── Guestbook ─────────────────────────────────────────────────────────── */

/** Format an ISO date string as a short locale date (e.g. "2 nov."). */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Fetch and render guestbook messages. */
async function loadMessages() {
  try {
    const list = await api('/api/messages');

    $('count').textContent = list.length + (list.length > 1 ? ' messages' : ' message');
    $('msgs').innerHTML = '';

    list.forEach((m) => {
      const row    = document.createElement('div');  row.className = 'msg';
      const quote  = document.createElement('q');    quote.textContent = m.text;
      const footer = document.createElement('div');
      const author = document.createElement('span'); author.textContent = m.author;
      const date   = document.createElement('small'); date.textContent  = formatDate(m.created_at);

      footer.append(author, date);
      row.append(quote, footer);
      $('msgs').append(row);
    });
  } catch {
    $('count').textContent = '';
  }
}

/** Post a new guestbook message. */
$('send').onclick = async (e) => {
  const btn  = e.currentTarget;
  const text = $('msg').value.trim();

  if (!text) { toast('Écrivez un message'); return; }

  btn.disabled = true;

  try {
    await api('/api/messages', 'POST', {
      author: $('fname').value.trim() || guest.name || 'Invité',
      text,
      token: TOKEN,
    });
    $('msg').value = '';
    toast("Message envoyé au livre d'or ✨");
    loadMessages();
  } catch (err) {
    toast(err.message);
  }

  btn.disabled = false;
};


/* ── PDF ticket generation ─────────────────────────────────────────────── */

/**
 * Reduce `fontSize` until `text` fits within `maxWidth` on the given canvas
 * context, then return the final size.
 */
function fitText(ctx, text, fontWeight, fontFamily, fontSize, maxWidth) {
  let size = fontSize;
  for (; size > 20; size -= 2) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

/** Draw centred text on a canvas, auto-shrinking to fit maxWidth. */
function drawText(ctx, text, x, y, fontWeight, fontFamily, fontSize, maxWidth, color) {
  const size = fitText(ctx, text, fontWeight, fontFamily, fontSize, maxWidth);
  ctx.font          = `${fontWeight} ${size}px ${fontFamily}`;
  ctx.fillStyle     = color;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** Render a QR code into a temporary off-screen div and return the element. */
function renderQRToCanvas(text) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(wrapper);

  new QRCode(wrapper, {
    text,
    width:          460,
    height:         460,
    colorDark:      '#3d2f18',
    colorLight:     '#ffffff',
    correctLevel:   QRCode.CorrectLevel.M,
  });

  const el = wrapper.querySelector('canvas') || wrapper.querySelector('img');
  return { el, cleanup: () => wrapper.remove() };
}

/** Load an image from a URL and resolve with the HTMLImageElement. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img  = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}

/** Build the full ticket canvas (background image + guest name + QR code). */
async function drawTicket() {
  // Ensure custom fonts are loaded before measuring text
  await Promise.all([
    document.fonts.load('80px "Pinyon Script"'),
    document.fonts.load('600 40px "Cormorant Garamond"'),
    document.fonts.load('italic 30px "Cormorant Garamond"'),
  ]).catch(() => {});

  const bg = await loadImage(TICKET.bg);
  const W  = bg.naturalWidth;
  const H0 = bg.naturalHeight;
  const FOOTER_H = 340;
  const H  = H0 + FOOTER_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const SCRIPT = '"Pinyon Script", "Brush Script MT", cursive';
  const SERIF  = '"Cormorant Garamond", Georgia, serif';
  const INK    = '#2e2a28';
  const GOLD   = '#a8741a';
  const SOFT   = '#6b5d4e';

  const guestName = guest.name || 'cher invité';

  // ── Background image ────────────────────────────────────────────────────
  ctx.drawImage(bg, 0, 0);

  // Overprint the guest name on the invitation template
  drawText(ctx, 'Vous convient ' + guestName, W / 2 - 2, 534, '600 ', SERIF, 38, 520, INK);

  // ── Footer strip ─────────────────────────────────────────────────────────
  // Sample the bottom edge of the image for the fill colour
  let r = 0, g = 0, b = 0;
  [0.4, 0.5, 0.6].forEach((f) => {
    const px = ctx.getImageData(Math.round(W * f), H0 - 4, 1, 1).data;
    r += px[0]; g += px[1]; b += px[2];
  });
  ctx.fillStyle = `rgb(${Math.round(r / 3)},${Math.round(g / 3)},${Math.round(b / 3)})`;
  ctx.fillRect(0, H0, W, FOOTER_H);

  // Gold divider line
  const divider = ctx.createLinearGradient(60, 0, W - 60, 0);
  divider.addColorStop(0,   'rgba(184,137,44,0)');
  divider.addColorStop(0.5, 'rgba(184,137,44,.9)');
  divider.addColorStop(1,   'rgba(184,137,44,0)');
  ctx.fillStyle = divider;
  ctx.fillRect(60, H0 + 8, W - 120, 2);

  // Gold diamond separator
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(W / 2,      H0 - 2);
  ctx.lineTo(W / 2 + 12, H0 + 9);
  ctx.lineTo(W / 2,      H0 + 20);
  ctx.lineTo(W / 2 - 12, H0 + 9);
  ctx.closePath();
  ctx.fill();

  // ── Footer text ───────────────────────────────────────────────────────────
  const textCenterX = (W - 320) / 2 + 20;
  drawText(ctx, 'Merci ' + guestName,                   textCenterX, H0 + 140, '',          SCRIPT, 72, 600, GOLD);
  drawText(ctx, "d'avoir confirmé votre présence",       textCenterX, H0 + 205, 'italic 500 ', SERIF,  42, 600, INK);
  drawText(ctx, "Présentez ce billet à l'entrée",        textCenterX, H0 + 265, 'italic 500 ', SERIF,  30, 600, SOFT);

  // ── QR code card ──────────────────────────────────────────────────────────
  const qrText = TOKEN
    ? 'EC-' + TOKEN
    : 'invitation:irene-benjamin:' + (guest.name || 'invite');

  const qr = renderQRToCanvas(qrText);
  if (qr.el.decode) { try { await qr.el.decode(); } catch { /* noop */ } }

  const qrX = W - 320, qrY = H0 + 42, qrSize = 260;

  // White card behind QR
  ctx.fillStyle   = '#ffffff';
  ctx.strokeStyle = 'rgba(184,137,44,.8)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(qrX, qrY, qrSize, qrSize, 14);
  else ctx.rect(qrX, qrY, qrSize, qrSize);
  ctx.fill();
  ctx.stroke();

  ctx.drawImage(qr.el, qrX + 20, qrY + 20, qrSize - 40, qrSize - 40);
  qr.cleanup();

  drawText(ctx, 'BILLET PERSONNEL', qrX + qrSize / 2, qrY + qrSize + 34, '600 ', SERIF, 24, qrSize, GOLD);

  return canvas;
}

/** Handle the "Download PDF ticket" button click. */
$('dl').onclick = async (e) => {
  const btn   = e.currentTarget;
  const label = btn.textContent;

  if (guest.status !== 'accepted') return;

  if (!window.jspdf) {
    toast("Le module PDF ne s'est pas chargé. Vérifiez votre connexion.");
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Création du billet…';

  try {
    const canvas = await drawTicket();
    const PW = 120;
    const PH = PW * canvas.height / canvas.width;

    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      [PW, PH],
    });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW, PH);

    const safeName = ('billet-' + (guest.name || 'invite'))
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();

    pdf.save(safeName + '.pdf');
    toast('Billet téléchargé ✨');
  } catch {
    toast('Impossible de créer le billet, réessayez.');
  }

  btn.disabled    = false;
  btn.textContent = label;
};


/* ── Bootstrap ─────────────────────────────────────────────────────────── */
renderRsvp();
loadMessages();
loadGuest();
