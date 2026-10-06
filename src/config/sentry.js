/**
 * @file sentry.js
 * @description Optional Sentry error tracking. Disabled (no-op) unless
 * SENTRY_DSN is set, so the app runs unchanged in local/dev without a DSN.
 * Exposes small wrappers so callers never depend on Sentry being initialized.
 */

const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;
const enabled = Boolean(dsn);

if (enabled) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
  });
}

/**
 * Report an exception to Sentry (no-op when disabled).
 * @param {unknown} error
 * @param {Record<string, unknown>} [context]
 */
function captureException(error, context) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setContext('request', context);
    Sentry.captureException(error);
  });
}

module.exports = { Sentry, captureException, enabled };
