/** Collapses whitespace, trims and limits the length of user text. */
const clean = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
module.exports = { clean, clamp };
