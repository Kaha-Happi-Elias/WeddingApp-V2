const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');
const { migrate } = require('./migrations');

if (config.dbPath !== ':memory:') fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
migrate(db);

module.exports = db;
