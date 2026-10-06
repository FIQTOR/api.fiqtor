/**
 * @file index.js
 * @description Main entry point for the Fiqtor API server.
 * The Express app itself is built in `src/app.js` (so it can be imported in
 * tests); this file only wires up the environment and starts listening.
 */

require('dotenv').config();

// Initialize Sentry as early as possible (no-op without SENTRY_DSN) so it can
// instrument the app before any other module is loaded.
require('./src/config/sentry');

const { createApp } = require('./src/app');
const logger = require('./src/config/logger');

const PORT = process.env.APP_PORT || 4000;
const ENV = process.env.NODE_ENV || 'development';
const IS_PROD = ENV === 'production';

const app = createApp();

app.listen(PORT, (err) => {
  if (err) {
    logger.fatal({ err }, 'failed to start server');
    throw err;
  }

  logger.info(
    { env: ENV, port: PORT, url: IS_PROD ? undefined : `http://localhost:${PORT}` },
    `server is running (${ENV})`,
  );
});
