import { $ } from '../utils/dom.js';
import { WEDDING_DATE } from '../config.js';

const target = new Date(WEDDING_DATE);
const pad = (n, width) => String(n).padStart(width, '0');

function tick() {
  const t = Math.max(0, target - Date.now()) / 1000 | 0;
  $('d').textContent = pad(t / 86400 | 0, 3);
  $('h').textContent = pad(t % 86400 / 3600 | 0, 2);
  $('m').textContent = pad(t % 3600 / 60 | 0, 2);
  $('s').textContent = pad(t % 60, 2);
}

export function initCountdown() { tick(); setInterval(tick, 1000); }
