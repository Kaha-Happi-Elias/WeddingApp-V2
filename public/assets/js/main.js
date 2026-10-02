import { initCountdown } from './features/countdown.js';
import { initCalendar } from './features/calendar.js';
import { initSplash } from './features/splash.js';
import { initRsvp, renderGuest, loadGuest } from './features/rsvp.js';
import { initGuestbook, loadMessages } from './features/guestbook.js';
import { initTicket } from './features/ticket.js';

initCountdown();
initCalendar();
initSplash();
initRsvp();
initGuestbook();
initTicket();

renderGuest();     // paint what we already know (localStorage for open links)
loadMessages();
loadGuest();       // personal link: fetch name, table, previous answer
