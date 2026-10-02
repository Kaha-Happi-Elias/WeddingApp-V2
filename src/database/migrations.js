/** Creates the tables on first start and upgrades older databases (adds missing columns). */
const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

function addColumn(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      token       TEXT NOT NULL UNIQUE,          -- secret part of the personal link
      name        TEXT NOT NULL,
      table_label TEXT,
      created_at  TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE TABLE IF NOT EXISTS rsvps (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      name_key   TEXT NOT NULL UNIQUE,           -- one answer per guest ("guest:<id>" for personal links)
      status     TEXT NOT NULL CHECK (status IN ('accepted','declined')),
      guest_id   INTEGER,
      phone      TEXT,
      seats      INTEGER DEFAULT 1,
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (${NOW}),
      updated_at TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author     TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (${NOW})
    );
  `);
  // upgrades for databases created by earlier versions
  addColumn(db, 'rsvps', 'guest_id', 'INTEGER');
  addColumn(db, 'rsvps', 'phone', 'TEXT');
  addColumn(db, 'rsvps', 'seats', 'INTEGER DEFAULT 1');
  addColumn(db, 'rsvps', 'note', 'TEXT');
  addColumn(db, 'guests', 'table_label', 'TEXT');
}

module.exports = { migrate, NOW };
