import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';
import { TICKET_BG } from '../config.js';
import { qrText } from './qr.js';

/* ----- PDF ticket: your invitation image + the guest's name + thank-you + QR code ----- */
function fitText(ctx, text, pre, family, size, maxW){
  let sz = size;
  for (; sz > 20; sz -= 2){ ctx.font = pre + sz + 'px ' + family; if (ctx.measureText(text).width <= maxW) break; }
  return sz;
}
function say(ctx, text, x, y, pre, family, size, maxW, color){
  const sz = fitText(ctx, text, pre, family, size, maxW);
  ctx.font = pre + sz + 'px ' + family; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}
function makeQR(text){
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(d);
  new QRCode(d, { text, width: 460, height: 460, colorDark: '#3d2f18', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  const el = d.querySelector('canvas') || d.querySelector('img');
  return { el, done: () => d.remove() };
}
function loadImg(src){ return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }

async function drawTicket(){
  await Promise.all([document.fonts.load('80px "Pinyon Script"'), document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('italic 30px "Cormorant Garamond"')]).catch(() => {});
  const bg = await loadImg(TICKET_BG);
  const W = bg.naturalWidth, H0 = bg.naturalHeight, F = 340, H = H0 + F;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const SCRIPT = '"Pinyon Script", "Brush Script MT", cursive', SERIF = '"Cormorant Garamond", Georgia, serif';
  const INK = '#2e2a28', GOLD = '#a8741a', SOFT = '#6b5d4e';
  const who = state.guest.name || 'cher invité';

  ctx.drawImage(bg, 0, 0);                                    // the invitation, unchanged
  say(ctx, 'Vous convient ' + who, W / 2 - 2, 534, '600 ', SERIF, 38, 520, INK);   // replaces the dotted line

  // footer strip in the same marble white
  let r = 0, g = 0, b = 0;
  [.4, .5, .6].forEach(f => { const d = ctx.getImageData(Math.round(W * f), H0 - 4, 1, 1).data; r += d[0]; g += d[1]; b += d[2]; });
  ctx.fillStyle = 'rgb(' + Math.round(r / 3) + ',' + Math.round(g / 3) + ',' + Math.round(b / 3) + ')';
  ctx.fillRect(0, H0, W, F);
  const line = ctx.createLinearGradient(60, 0, W - 60, 0);
  line.addColorStop(0, 'rgba(184,137,44,0)'); line.addColorStop(.5, 'rgba(184,137,44,.9)'); line.addColorStop(1, 'rgba(184,137,44,0)');
  ctx.fillStyle = line; ctx.fillRect(60, H0 + 8, W - 120, 2);
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(W / 2, H0 - 2); ctx.lineTo(W / 2 + 12, H0 + 9); ctx.lineTo(W / 2, H0 + 20); ctx.lineTo(W / 2 - 12, H0 + 9); ctx.closePath(); ctx.fill();

  const cx = (W - 320) / 2 + 20;
  say(ctx, 'Merci ' + who, cx, H0 + 140, '', SCRIPT, 72, 600, GOLD);
  say(ctx, "d'avoir confirmé votre présence", cx, H0 + 205, 'italic 500 ', SERIF, 42, 600, INK);
  say(ctx, "Présentez ce billet à l'entrée", cx, H0 + 265, 'italic 500 ', SERIF, 30, 600, SOFT);

  // QR code card
  const qr = makeQR(qrText());
  if (qr.el.decode) { try { await qr.el.decode(); } catch(e){} }
  const qx = W - 320, qy = H0 + 42, qs = 260;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(184,137,44,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(qx, qy, qs, qs, 14); else ctx.rect(qx, qy, qs, qs); ctx.fill(); ctx.stroke();
  ctx.drawImage(qr.el, qx + 20, qy + 20, qs - 40, qs - 40); qr.done();
  say(ctx, 'BILLET PERSONNEL', qx + qs / 2, qy + qs + 34, '600 ', SERIF, 24, qs, GOLD);
  return c;
}

/** Wires the "Télécharger mon billet (PDF)" button. */
export function initTicket() {
  $('dl').onclick = async e => {
    const btn = e.currentTarget, label = btn.textContent;
    if (state.guest.status !== 'accepted') return;
    if (!window.jspdf) { toast('Le module PDF ne s\'est pas chargé. Vérifiez votre connexion.'); return; }
    btn.disabled = true; btn.textContent = 'Création du billet…';
    try {
      const canvas = await drawTicket();
      const PW = 120, PH = PW * canvas.height / canvas.width;
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: [PW, PH] });
      pdf.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, PW, PH);
      const file = ('billet-' + (state.guest.name || 'invite')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.pdf';
      pdf.save(file);
      toast('Billet téléchargé ✨');
    } catch(err){ toast('Impossible de créer le billet, réessayez.'); }
    btn.disabled = false; btn.textContent = label;
  };
}
