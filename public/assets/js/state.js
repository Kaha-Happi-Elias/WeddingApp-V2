/*import { store } from './utils/storage.js';*/

/** Shared state: the personal-link token (if any) and the current guest. */
/*const token = new URLSearchParams(location.search).get('g');

export const state = {
  token,
  guest: token ? { name: '', status: '' } : store.get('guest', { name: '', status: '' }),
};*/


/** Shared state: the personal-link token (if any) and the current guest. */
const token = new URLSearchParams(location.search).get('g');
 
// The open link never remembers anyone: the form always starts empty.
// (Removes what an earlier version of the site may have saved on this device.)
try { localStorage.removeItem('guest'); } catch (e) { /* storage blocked: nothing to remove */ }
 
export const state = {
  token,
  guest: { name: '', status: '' },
};