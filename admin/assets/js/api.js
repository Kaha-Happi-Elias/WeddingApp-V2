/** All calls to the admin API. The browser re-sends the dashboard password automatically. */
async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(res.status);
  return res.json().catch(() => ({}));
}
const del = url => request(url, { method: 'DELETE' });

export const adminApi = {
  loadAll: () => Promise.all([
    request('/api/admin/summary'), request('/api/admin/rsvps'),
    request('/api/admin/messages'), request('/api/admin/guests'),
  ]).then(([summary, rsvps, messages, guests]) => ({ summary, rsvps, messages, guests })),
  deleteMessage: id => del('/api/admin/messages/' + id),
  deleteRsvp: id => del('/api/admin/rsvps/' + id),
  deleteGuest: id => del('/api/admin/guests/' + id),
  createGuests: names => request('/api/admin/guests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }),
  }),
};
