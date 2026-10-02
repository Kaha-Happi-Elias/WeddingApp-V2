const express = require('express');
const config = require('./config');
const basicAuth = require('./middleware/basicAuth');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');

/** Builds the Express application (kept separate from server.js so it can be tested). */
module.exports = function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '50kb' }));

  // API
  app.use('/api/admin', basicAuth, adminRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', apiNotFound);

  // Pages
  app.use('/admin', basicAuth, express.static(config.paths.admin));   // newlyweds' dashboard (password protected)
  app.use(express.static(config.paths.public));                       // guests' invitation page

  app.use(errorHandler);
  return app;
};
