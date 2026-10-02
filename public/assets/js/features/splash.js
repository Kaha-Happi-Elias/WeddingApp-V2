import { $ } from '../utils/dom.js';
import { MUSIC_URL } from '../config.js';

const music = $('bgm');
let hasMusic = false;

/** Fade-in of every .rv block when it scrolls into view. */
function reveal() {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
}

function open() {
  $('splash').classList.add('gone');
  $('site').hidden = false;
  document.body.classList.remove('lock');
  if (hasMusic) {
    music.play().then(() => { $('music').hidden = false; })
      .catch(() => { $('music').hidden = false; $('music').textContent = '▶'; });
  }
  setTimeout(() => $('splash').remove(), 1000);
  reveal();
}

export function initSplash() {
  // the music button only exists if you put a file at public/assets/audio/music.mp3
  fetch(MUSIC_URL, { method: 'HEAD' }).then(r => { if (r.ok) { hasMusic = true; music.src = MUSIC_URL; } }).catch(() => {});
  $('openBtn').onclick = open;
  $('music').onclick = () => {
    if (music.paused) { music.play(); $('music').textContent = '❚❚'; }
    else { music.pause(); $('music').textContent = '▶'; }
  };
}
