/**
 * @file logger.js
 * @description HTTP request logger middleware (pino-http) backed by the shared
 * pino instance. Emits one structured line per request with method, url, status
 * and duration. CRLF is stripped from logged values to prevent log injection,
 * and sensitive headers are redacted by the base logger config.
 */

const { randomUUID } = require('node:crypto');
const { pinoHttp } = require('pino-http');
const logger = require('../config/logger');

// Strip CR/LF (log-injection guard) and cap length on any logged string.
const clean = (value, max = 200) => {
  const s = String(value ?? '').replace(/[\r\n]/g, '');
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.id || req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customSuccessMessage: (req, res) => `${req.method} ${clean(req.url)} - ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${clean(req.url)} - ${res.statusCode} - ${clean(err?.message, 300)}`,
  customProps: (req) => ({ ip: clean(req.ip || req.socket?.remoteAddress || 'unknown') }),
  // Health checks are noise — skip logging them.
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});

module.exports = httpLogger;
