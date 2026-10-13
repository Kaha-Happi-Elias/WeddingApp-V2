/** All calls to the server live here. */
async function request(url, method = 'GET', body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur, veuillez réessayer.');
  return data;
}

export const api = {
  getGuest: token => request('/api/guest/' + encodeURIComponent(token)),
  saveRsvp: payload => request('/api/rsvp', 'POST', payload),
  getMessages: token => request('/api/messages' + (token ? '?token=' + encodeURIComponent(token) : '')),
  postMessage: payload => request('/api/messages', 'POST', payload),
};
