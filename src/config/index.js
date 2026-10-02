require('dotenv').config();
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

module.exports = {
  root,
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || path.join(root, 'data', 'wedding.db'),
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || 'changeme',
  },
  paths: {
    public: path.join(root, 'public'),
    admin: path.join(root, 'admin'),
  },
  limits: {
    writesPerMinute: 20,   // anti-spam, per visitor
    maxSeats: 10,
    maxNames: 500,         // guests created in one admin request
  },
};
