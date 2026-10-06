/**
 * Social stats service.
 *
 * Serves TikTok / Instagram follower counts. Strategy, in order of preference:
 *
 *   1. REALTIME — scrape the public profile page's `og:description` meta tag
 *      (no login, no API keys). This works for Instagram; TikTok blocks
 *      server-side scraping from most hosts, so it usually falls through.
 *   2. CACHE — reuse the last successful realtime result (kept warm in memory).
 *   3. DEFAULT — the hand-maintained numbers in `config/social.js`.
 *
 * It never throws: a failed fetch always degrades to cache/default so the
 * frontend always gets a usable payload (`success: true`), and the `source`
 * field tells you which tier answered.
 *
 * Endpoint: GET /api/v1/social/stats
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const logger = require("../config/logger");

const socialConfig = require("../config/social");

const REQUEST_TIMEOUT_MS = Number(process.env.SOCIAL_TIMEOUT_MS) || 8000;
const CACHE_TTL_MS = Number(process.env.SOCIAL_CACHE_TTL_MS) || 15 * 60 * 1000; // 15 min

// Prefer IPv4 to avoid IPv6-first connection hangs on some hosts (a common
// cause of ETIMEDOUT), mirroring the WakaTime service.
const httpAgent = new http.Agent({ keepAlive: true, family: 4 });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

// Profile pages only serve the crawlable `<meta>` tags (which is where the
// public follower counts live) to crawler/social-preview user agents. A regular
// browser UA gets the JS-gated shell with no meta tags, so we identify as a
// well-known crawler to read the SAME public metadata that search engines see.
const CRAWLER_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// In-memory cache (per server instance).
let cache = { data: null, timestamp: 0 };

/** Turn a compact count like "1.2M" / "2,006" / "671" into a number. */
const parseCompactNumber = (raw) => {
  if (!raw) return null;
  const clean = String(raw).replace(/,/g, "").trim();
  const match = clean.match(/^([\d.]+)\s*([KMB])?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  const unit = (match[2] || "").toUpperCase();
  const multiplier = unit === "K" ? 1e3 : unit === "M" ? 1e6 : unit === "B" ? 1e9 : 1;
  return Math.round(value * multiplier);
};

/**
 * Parse follower/following out of an Instagram `og:description` string, e.g.
 *   "694 Followers, 586 Following, 7 Posts - See Instagram photos ..."
 */
const parseInstagramDescription = (html) => {
  const meta = html.match(
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i
  );
  if (!meta) return null;
  const desc = meta[1];

  const followers = desc.match(/([\d.,]+[KMB]?)\s+Followers/i);
  const following = desc.match(/([\d.,]+[KMB]?)\s+Following/i);
  if (!followers || !following) return null;

  const f = parseCompactNumber(followers[1]);
  const g = parseCompactNumber(following[1]);
  if (f === null || g === null) return null;
  return { followers: f, following: g };
};

/** Scrape a public Instagram profile for follower/following counts. */
const fetchInstagram = async (username) => {
  const { data } = await axios.get(`https://www.instagram.com/${username}/`, {
    headers: { "User-Agent": CRAWLER_UA, Accept: "text/html" },
    timeout: REQUEST_TIMEOUT_MS,
    httpAgent,
    httpsAgent,
    maxRedirects: 5,
  });
  return parseInstagramDescription(data);
};

/** Scrape a public TikTok profile for follower/following counts. */
const fetchTiktok = async (username) => {
  const { data } = await axios.get(`https://www.tiktok.com/@${username}`, {
    headers: { "User-Agent": CRAWLER_UA, Accept: "text/html" },
    timeout: REQUEST_TIMEOUT_MS,
    httpAgent,
    httpsAgent,
    maxRedirects: 5,
  });

  // TikTok embeds a JSON blob; follower counts appear as followerCount /
  // followingCount. Fall back to the SIGI_STATE / universal data if present.
  const followers = data.match(/"followerCount":(\d+)/);
  const following = data.match(/"followingCount":(\d+)/);
  if (followers && following) {
    return {
      followers: Number(followers[1]),
      following: Number(following[1]),
    };
  }
  return null;
};

/** Merge a fetched platform result over the static default (partial-safe). */
const withFallback = (fetched, fallback) => ({
  followers: fetched?.followers ?? fallback.followers,
  following: fetched?.following ?? fallback.following,
});

/**
 * Build the full social payload, attempting realtime first and degrading to
 * cache/default. Never throws.
 */
const buildSocialStats = async () => {
  const { usernames, tiktok: tiktokDefault, instagram: instagramDefault } =
    socialConfig;

  let tiktok = null;
  let instagram = null;

  // Fetch both in parallel; each side fails independently.
  const [tiktokResult, instagramResult] = await Promise.allSettled([
    fetchTiktok(usernames.tiktok),
    fetchInstagram(usernames.instagram),
  ]);

  if (tiktokResult.status === "fulfilled") tiktok = tiktokResult.value;
  else logger.warn({ err: tiktokResult.reason?.message }, "TikTok realtime fetch failed");

  if (instagramResult.status === "fulfilled") instagram = instagramResult.value;
  else
    logger.warn(
      { err: instagramResult.reason?.message },
      "Instagram realtime fetch failed"
    );

  const liveTiktok = withFallback(tiktok, tiktokDefault);
  const liveInstagram = withFallback(instagram, instagramDefault);

  // If neither platform produced live data, prefer the cached values (if any)
  // before the hard-coded defaults, so we don't regress a known-good number.
  const nothingLive = !tiktok && !instagram;
  if (nothingLive && cache.data) {
    return { ...cache.data, source: "cache" };
  }

  const anyLive = Boolean(tiktok || instagram);
  return {
    tiktok: liveTiktok,
    instagram: liveInstagram,
    source: anyLive ? "realtime" : "default",
  };
};

/**
 * GET /api/v1/social/stats
 * Returns TikTok / Instagram follower counts (realtime, cached, or default).
 */
const getSocialStats = async (req, res) => {
  const now = Date.now();
  const cacheFresh = cache.data && now - cache.timestamp < CACHE_TTL_MS;

  if (cacheFresh) {
    return res.status(200).json({
      success: true,
      source: cache.data.source,
      data: {
        tiktok: cache.data.tiktok,
        instagram: cache.data.instagram,
        lastUpdated: cache.data.lastUpdated,
      },
    });
  }

  const stats = await buildSocialStats();
  const lastUpdated = new Date().toISOString();

  cache = { data: { ...stats, lastUpdated }, timestamp: now };

  return res.status(200).json({
    success: true,
    source: stats.source,
    data: {
      tiktok: stats.tiktok,
      instagram: stats.instagram,
      lastUpdated,
    },
  });
};

module.exports = {
  getSocialStats,
  // Exported for unit tests (pure helpers).
  parseCompactNumber,
  parseInstagramDescription,
  withFallback,
};
