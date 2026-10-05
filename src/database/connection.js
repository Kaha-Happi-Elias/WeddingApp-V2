/*const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');
const { migrate } = require('./migrations');

if (config.dbPath !== ':memory:') fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
migrate(db);

module.exports = db;*/

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { migrate } = require('./migrations');

/**
 * Opens SQLite with whichever engine works on this server:
 *   1. better-sqlite3 (native module, fastest)  - used when it is installed and loads correctly
 *   2. node:sqlite, built into Node.js 22.13+   - nothing to install, no glibc requirement
 * Both expose the same calls used by the repositories, so no other file depends on the engine.
 */
function openDatabase(file) {
  let nativeError;
  try {
    const Database = require('better-sqlite3');
    console.log('Database engine: better-sqlite3');
    return new Database(file);
  } catch (e) { nativeError = e; }

  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); }
  catch (e) {
    throw new Error(
      'No SQLite engine available.\n' +
      ' - better-sqlite3 failed: ' + (nativeError.code || nativeError.message) + '\n' +
      ' - node:sqlite needs Node.js 22.13 or newer. In cPanel (Setup Node.js App) choose Node 22 or 24, then restart.');
  }
  console.log('Database engine: node:sqlite (built into Node.js)');
  const raw = new DatabaseSync(file);
  return {
    pragma: statement => raw.exec('PRAGMA ' + statement),
    exec: sql => raw.exec(sql),
    prepare: sql => raw.prepare(sql),
    transaction: fn => (...args) => {
      raw.exec('BEGIN');
      try { const result = fn(...args); raw.exec('COMMIT'); return result; }
      catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

if (config.dbPath !== ':memory:') fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = openDatabase(config.dbPath);
try { db.pragma('journal_mode = WAL'); } catch (e) { /* some shared file systems do not support WAL: keep the default mode */ }
migrate(db);

module.exports = db;

