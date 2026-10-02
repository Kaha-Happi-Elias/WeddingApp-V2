/**
 * Entry point: loads the configuration, starts the HTTP server.
 * (Kept at the project root because most hosts look for "server.js" or "app.js" here.)
 */
const config = require('./src/config');
const createApp = require('./src/app');

if (config.admin.password === 'changeme') {
  console.warn('⚠️  ADMIN_PASSWORD is not set in .env — anyone could guess it. Change it!');
}

createApp().listen(config.port, () => {
  console.log(`✅ Invitation:  http://localhost:${config.port}`);
  console.log(`🔐 Espace mariés: http://localhost:${config.port}/admin`);
});
