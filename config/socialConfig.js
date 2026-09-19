/**
 * Static social-media statistics.
 *
 * ⚠️ SECURITY / PRIVACY FIRST
 *   This project intentionally does NOT scrape or call third-party social
 *   APIs (Instagram Graph / TikTok / Behold). Those need secret tokens and
 *   break often. Instead, the follower numbers are hand-maintained here.
 *
 *   ➜ Update the numbers below and restart the server when they change.
 *
 *   Shape returned by GET /api/v1/social/stats:
 *     { success: true, data: { tiktok, instagram, lastUpdated } }
 */

const socialConfig = {
  tiktok: { followers: 2006, following: 49 },
  instagram: { followers: 671, following: 572 },
};

module.exports = socialConfig;
