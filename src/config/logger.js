/**
 * @file logger.js
 * @description Central structured logger (pino). Emits JSON in production so log
 * aggregators (Vercel, Datadog, etc.) can parse fields, and human-readable
 * pretty output in development. A shared instance keeps log levels and
 * redaction consistent across the app.
 */

const pino = require('pino');

const ENV = process.env.NODE_ENV || 'development';
const IS_PROD = ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (IS_PROD ? 'info' : 'debug'),
  // Never let secrets or personal data reach the logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
      'password',
      'token',
      '*.password',
      '*.token',
    ],
    remove: true,
  },
  // Pretty in dev; raw JSON (fast, parseable) in prod.
  transport: IS_PROD
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});

module.exports = logger;
