const rateLimit = require('express-rate-limit');

/**
 * Centralised rate-limit configuration.
 *
 * Strategy: a generous global limiter plus stricter, purpose-specific limiters
 * for expensive or abuse-prone endpoints. AI calls cost real money per request,
 * so `/ai/generate` gets both a per-window burst limit AND a daily quota.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a JSON 429 body shared by every limiter. */
const limitMessage = (error) => ({ status: 429, error });

// General API limiter — a broad safety net across all routes.
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 1000,
  message: limitMessage('Too many requests from this IP, please try again after 15 minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// AI burst limiter — caps how many prompts a single IP can fire per window.
const aiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 30,
  message: limitMessage('AI rate limit reached. Please wait a few minutes before asking another question.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// AI daily quota — hard ceiling per IP per day (cost control). Kept in the same
// store family as the burst limiter so the two work together.
const aiDailyLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 200,
  message: limitMessage('Daily AI quota reached. Please try again tomorrow.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form limiter — prevents spam through WhatsApp/Email channels.
const contactLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  message: limitMessage('Too many contact form submissions. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Stats limiter — the read-only endpoints hit external APIs (GitHub/WakaTime),
// so they get a lighter cap than the global limiter.
const statsLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 120,
  message: limitMessage('Too many stats requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  aiLimiter,
  aiDailyLimiter,
  contactLimiter,
  statsLimiter,
};
