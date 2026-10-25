/**
 * CORS policy for the public API.
 *
 * `FRONTEND_HOST` is a single origin, but the site is reachable at both the
 * apex and `www` (and from preview deployments), so an exact single-origin
 * match is too brittle: whoever deploys has to remember to update the env var
 * or the browser silently blocks every AI/contact request.
 *
 * Instead `FRONTEND_HOST` is treated as a list (comma-separated) and, when it
 * contains a bare registrable domain (e.g. `fiqtor.com`), its `www.` and
 * `https://` variants are derived automatically. Additionally, Vercel preview
 * hosts are accepted in non-production so PR previews keep working.
 */

/** Split a comma-separated env value into trimmed, non-empty origins. */
const parseHosts = (raw) =>
  String(raw || '')
    .split(',')
    .map((h) => h.trim().replace(/\/+$/, ''))
    .filter(Boolean);

/**
 * Expand one configured host into the variants a browser may actually send.
 * A value with a scheme is kept as-is (plus its scheme-less form); a bare
 * domain yields both `https://` and `https://www.` forms.
 * @param {string} host
 * @returns {string[]}
 */
const expand = (host) => {
  const out = new Set([host]);

  const bare = host.replace(/^https?:\/\//i, '');
  out.add(`https://${bare}`);
  out.add(`https://www.${bare}`);

  // A literal scheme value should also match its canonical https twin
  // ("http://fiqtor.com" → "https://fiqtor.com"), which is what a browser on
  // the deployed site actually sends.
  if (/^http:\/\//i.test(host)) out.add(host.replace(/^http:/i, 'https:'));

  return [...out];
};

const configured = parseHosts(process.env.FRONTEND_HOST);
const allowedOrigins = new Set(configured.flatMap(expand));

// Dev-only conveniences. Kept out of production so a deployed API never
// accepts calls from someone's local dev server.
if (process.env.NODE_ENV !== 'production') {
  ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'].forEach((o) =>
    allowedOrigins.add(o),
  );
}

/** Vercel preview deployments: `*.vercel.app` only, and only outside prod. */
const isPreviewOrigin = (origin) =>
  process.env.NODE_ENV !== 'production' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, server-to-server, curl).
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin) || isPreviewOrigin(origin)) {
      return callback(null, true);
    }

    // Reject by withholding the CORS header instead of raising: throwing here
    // turns a browser preflight into a 500 in the logs and leaks nothing useful.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
module.exports.allowedOrigins = allowedOrigins;
