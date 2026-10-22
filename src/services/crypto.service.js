/**
 * Crypto service — serves LIVE market data.
 *
 * Strategy, in order of preference (mirrors `social.service.js`):
 *
 *   1. LIVE    — CoinGecko `/coins/markets` (no API key required for the public
 *                demo tier). Fetched server-side, so no secret ever reaches the
 *                browser.
 *   2. CACHE   — the last successful live payload, kept warm in memory and
 *                served while fresh (default 30s).
 *   3. STALE   — the last successful live payload when upstream fails.
 *   4. STATIC  — the hand-maintained numbers in `config/crypto.js`, used only
 *                when upstream has never succeeded (e.g. cold start + outage).
 *
 * It never throws: the response always contains a usable payload and the
 * `source` field (live | cache | stale-cache | static) says which tier answered.
 *
 * Endpoint: GET /api/v1/crypto
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const logger = require("../config/logger");

const cryptoConfig = require("../config/crypto");

const REQUEST_TIMEOUT_MS = Number(process.env.CRYPTO_TIMEOUT_MS) || 8000;
const CACHE_TTL_MS = Number(process.env.CRYPTO_CACHE_TTL_MS) || 30 * 1000; // 30s

// Optional key for higher CoinGecko rate limits (absent = public tier).
const API_KEY = process.env.COINGECKO_API_KEY;

const MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";
const VS_CURRENCY = "usd";

// Prefer IPv4 to avoid IPv6-first connection hangs on some hosts (a common
// cause of ETIMEDOUT), mirroring the WakaTime / social services.
const httpAgent = new http.Agent({ keepAlive: true, family: 4 });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

// Maps our response keys → CoinGecko coin ids.
const COIN_IDS = { btc: "bitcoin", eth: "ethereum", sol: "solana" };

// In-memory cache (per server instance).
let cache = { data: null, timestamp: 0 };
// Dedupe concurrent upstream calls (many visitors → one request).
let inFlight = null;

/**
 * Convert a percentage change (e.g. -0.57 meaning -0.57%) into the RATIO the
 * frontend contract expects (`delta.month = 1.05` → +5%). Missing/non-numeric
 * values become 1 (unchanged).
 */
const percentToRatio = (percent) => {
  const value = typeof percent === "number" ? percent : Number(percent);
  if (!Number.isFinite(value)) return 1;
  return 1 + value / 100;
};

/**
 * Map a CoinGecko `/coins/markets` array into our public payload shape:
 *   { btc, eth, sol } where each coin has { code, rate, delta: { month, day } }
 */
const mapMarketData = (markets) => {
  if (!Array.isArray(markets)) return null;

  const byId = new Map(
    markets.filter((m) => m && typeof m.id === "string").map((m) => [m.id, m]),
  );

  const result = {};
  for (const [key, id] of Object.entries(COIN_IDS)) {
    const market = byId.get(id);
    const rate = Number(market?.current_price);
    // A missing/invalid price makes the whole payload unusable for that coin.
    if (!market || !Number.isFinite(rate) || rate <= 0) return null;

    result[key] = {
      code: key.toUpperCase(),
      rate,
      delta: {
        month: percentToRatio(
          market.price_change_percentage_30d_in_currency ??
            market.price_change_percentage_30d,
        ),
        day: percentToRatio(
          market.price_change_percentage_24h_in_currency ??
            market.price_change_percentage_24h,
        ),
      },
    };
  }

  return result;
};

/** Fetch live prices from CoinGecko (single request for all coins). */
async function fetchLivePrices() {
  const headers = { Accept: "application/json" };
  if (API_KEY) headers["x-cg-demo-api-key"] = API_KEY;

  const response = await axios.get(MARKETS_URL, {
    params: {
      vs_currency: VS_CURRENCY,
      ids: Object.values(COIN_IDS).join(","),
      order: "market_cap_desc",
      sparkline: false,
      // `*_in_currency` variants are what CoinGecko actually populates.
      price_change_percentage: "24h,30d",
    },
    headers,
    timeout: REQUEST_TIMEOUT_MS,
    httpAgent,
    httpsAgent,
  });

  const mapped = mapMarketData(response?.data);
  if (!mapped) throw new Error("Malformed CoinGecko response");
  return mapped;
}

/** Return the in-flight request, starting one only if none is running. */
function getSharedFetch() {
  if (!inFlight) {
    inFlight = fetchLivePrices().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/**
 * GET /api/v1/crypto
 * Returns USD prices for BTC / ETH / SOL with 24h + 30d deltas.
 */
const getCryptoPrices = async (req, res) => {
  const now = Date.now();

  // 1. Fresh cache → answer instantly, no upstream call.
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      status: "success",
      source: "cache",
      data: cache.data,
    });
  }

  try {
    const data = await getSharedFetch();
    cache = { data, timestamp: Date.now() };

    return res.status(200).json({
      status: "success",
      source: "live",
      data,
    });
  } catch (error) {
    logger.warn(
      { err: error.code || error.message },
      "Crypto upstream (CoinGecko) failed",
    );

    // 2. Stale cache → better than nothing.
    if (cache.data) {
      return res.status(200).json({
        status: "success",
        source: "stale-cache",
        data: cache.data,
      });
    }

    // 3. Never fetched successfully → static fallback keeps the UI alive.
    return res.status(200).json({
      status: "success",
      source: "static",
      data: cryptoConfig,
    });
  }
};

module.exports = {
  getCryptoPrices,
  // Exported for unit tests.
  mapMarketData,
  percentToRatio,
};
