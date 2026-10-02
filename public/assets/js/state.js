import { store } from './utils/storage.js';

/** Shared state: the personal-link token (if any) and the current guest. */
const token = new URLSearchParams(location.search).get('g');

export const state = {
  token,
  guest: token ? { name: '', status: '' } : store.get('guest', { name: '', status: '' }),
};
