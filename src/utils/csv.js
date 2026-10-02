/** One CSV cell, protected against spreadsheet formula injection. */
function cell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
const toCsv = rows => '\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n');
module.exports = { toCsv };
