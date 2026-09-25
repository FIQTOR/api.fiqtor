/**
 * @file app.js
 * @description Builds and configures the Express application (middlewares +
 * routes + error handling) WITHOUT starting a server. Exported separately from
 * `index.js` so tests can import the app via supertest without binding a port.
 */

const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const express = require('express');
const corsOptions = require('./config/cors');
const { apiLimiter } = require('./middleware/rate-limiter');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/error-handler');
const { configureRoutes } = require('./routes');

/**
 * Creates the configured Express application.
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  // Trust first proxy (required for Vercel / Nginx reverse proxy IP rate limiting)
  app.set('trust proxy', 1);

  // --- SECURITY MIDDLEWARES ---
  app.use(cors(corsOptions));
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Required for CORS
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    // Locked-down CSP suited to a JSON API
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    },
    // helmet defaults kept: X-Content-Type-Options nosniff, X-Frame-Options DENY
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    },
  }));
  app.use(apiLimiter);
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));
  app.use(hpp());
  app.use(cookieParser());
  app.use(logger);

  // --- Route Configuration ---
  configureRoutes(app);

  // --- GLOBAL ERROR HANDLER ---
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
