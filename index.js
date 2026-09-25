/**
 * @file index.js
 * @description Main entry point for the Fiqtor API server.
 * The Express app itself is built in `src/app.js` (so it can be imported in
 * tests); this file only wires up the environment and starts listening.
 */

require('dotenv').config();

const { createApp } = require('./src/app');

const PORT = process.env.APP_PORT || 4000;
const ENV = process.env.NODE_ENV || 'development';
const IS_PROD = ENV === 'production';

const app = createApp();

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
