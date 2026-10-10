/**
 * Social-media statistics configuration.
 *
 * ⚠️ SECURITY / PRIVACY FIRST
 *   This project intentionally does NOT call token-gated social APIs
 *   (Instagram Graph / TikTok Display) — those need secret tokens and break
 *   often. Instead we scrape the PUBLIC profile pages (no keys required) and,
 *   when that fails, fall back to the hand-maintained numbers below.
 *
 *   The values below are the DEFAULT / FALLBACK used whenever the realtime
 *   fetch is unavailable. Update them and restart the server as a baseline.
 *
 *   Shape returned by GET /api/v1/social/stats:
 *     { success: true, source, data: { tiktok, instagram, lastUpdated } }
 */

const socialConfig = {
  /** Public handles — used to build the profile URLs we scrape. */
  usernames: {
    tiktok: "fiqtor",
    instagram: "fiqtorr",
  },
  /** Fallback numbers (shown when the realtime fetch fails). */
  tiktok: { followers: 1955, following: 33, likes: 130000 },
  instagram: { followers: 696, following: 579 },
};

module.exports = socialConfig;
