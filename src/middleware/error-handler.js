/**
 * @file error-handler.js
 * @description Global Express error handler. Logs via the shared pino logger,
 * reports unexpected (5xx) failures to Sentry, and returns sanitized JSON so no
 * stack traces or credentials leak to clients.
 */

const logger = require('../config/logger');
const { captureException } = require('../config/sentry');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Sanitize error message for logging to prevent CRLF injection
  const safeMessage = String(err.message || '').replace(/[\r\n]/g, '');
  const requestId = req.id || res.getHeader('x-request-id');

  // Handle CORS errors specifically — expected client mistakes, not bugs.
  if (err.message === 'Access Denied by CORS Policy') {
    logger.warn({ requestId, err: safeMessage }, 'blocked by CORS policy');
    return res.status(403).json({ status: 'failed', error: 'Access Denied by CORS Policy' });
  }

  // Handle Multer / File size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn({ requestId, err: safeMessage }, 'upload rejected: file too large');
    return res.status(413).json({ status: 'failed', error: 'File too large. Maximum size allowed is 4.5MB.' });
  }

  // Only unexpected failures reach here — log full error + report to Sentry.
  logger.error({ requestId, err }, 'unhandled request error');
  captureException(err, { requestId, method: req.method, url: req.originalUrl });

  // Generic fallback error without leaking stack traces or sensitive credentials
  res.status(500).json({
    status: 'failed',
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

module.exports = errorHandler;
