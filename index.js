/**
 * @file index.js
 * @description Main entry point for the Fiqtor API server with security hardening.
 */

require('dotenv').config();

const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const corsOptions = require('./config/corsConfig');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const express = require('express');
const { configureRoutes } = require('./routes');

const PORT = process.env.APP_PORT || 4000;
const ENV = process.env.NODE_ENV || 'development';
const IS_PROD = ENV === 'production';

const app = express();

// Trust first proxy (required for Vercel / Nginx reverse proxy IP rate limiting)
app.set('trust proxy', 1);

// --- SECURITY MIDDLEWARES ---
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disabled if serving API only
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

// --- Server Startup ---
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    throw err;
  }

  const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
  };

  const listeningUrl = IS_PROD ? `Port ${PORT}` : `http://localhost:${PORT}`;
  const envString = `${colors.yellow}${ENV.padEnd(15)}${colors.reset}`;
  const urlString = `${colors.blue}${listeningUrl.padEnd(23)}${colors.reset}`;

  console.log("\n" + "┌──────────────────────────────────────────┐" + colors.reset);
  console.log(`│ 🚀 ${colors.green}Server is running!${colors.reset}                    │`);
  console.log(`│ 🌐 Environment : ${envString}         │`);
  console.log(`│ 📡 Listening on: ${urlString}   │`);
  console.log("└──────────────────────────────────────────┘" + colors.reset + "\n");
});
