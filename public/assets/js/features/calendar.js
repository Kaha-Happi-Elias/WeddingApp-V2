import { $ } from '../utils/dom.js';
import { CALENDAR_EVENT as e } from '../config.js';

export function initCalendar() {
  $('cal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(e.title)
    + '&dates=' + e.start + '/' + e.end
    + '&location=' + encodeURIComponent(e.location)
    + '&details=' + encodeURIComponent(e.details);
}
