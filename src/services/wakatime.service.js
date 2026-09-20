const { default: axios } = require("axios");
const http = require("http");
const https = require("https");

/**
 * WakaTime API service.
 *
 * Fetches all-time coding stats. The upstream (wakatime.com) can be slow or
 * unreachable, so this service:
 *   - applies a hard request TIMEOUT so requests fail fast (no hangs),
 *   - RETRIES transient network errors (ETIMEDOUT/ECONNRESET/5xx),
 *   - CACHES the last successful payload and serves it on failure instead of
 *     returning a hard 500 (graceful degradation),
 *   - validates that an API key is configured before calling upstream.
 */

const WAKATIME_URL =
  "https://wakatime.com/api/v1/users/current/all_time_since_today";

const REQUEST_TIMEOUT_MS = Number(process.env.WAKATIME_TIMEOUT_MS) || 8000;
const MAX_RETRIES = Number(process.env.WAKATIME_MAX_RETRIES) || 2;
const CACHE_TTL_MS = Number(process.env.WAKATIME_CACHE_TTL_MS) || 5 * 60 * 1000; // 5 min
const RETRY_DELAY_MS = 500;

// Prefer IPv4 to avoid IPv6-first connection hangs on hosts where IPv6 is
// advertised via DNS but not routable (a common cause of ETIMEDOUT).
const httpAgent = new http.Agent({ keepAlive: true, family: 4 });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

// In-memory cache (per server instance).
let cache = { data: null, timestamp: 0 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Decide whether an error is worth retrying. */
const isRetryable = (error) => {
  const code = error?.code;
  const status = error?.response?.status;
  if (["ETIMEDOUT", "ECONNRESET", "ECONNABORTED", "EAI_AGAIN", "ENOTFOUND"].includes(code)) {
    return true;
  }
  return typeof status === "number" && status >= 500;
};

/** Fetch stats from WakaTime with retries. */
async function fetchWakatimeStats(apiKey) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(WAKATIME_URL, {
        headers: { Authorization: `Basic ${apiKey}` },
        timeout: REQUEST_TIMEOUT_MS,
        httpAgent,
        httpsAgent,
      });

      const payload = response?.data?.data;
      if (!payload) {
        throw new Error("Malformed WakaTime response");
      }
      return payload;
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error);
      const isLastAttempt = attempt === MAX_RETRIES;

      console.error(
        `WakaTime request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}` +
          `${retryable ? ", retryable" : ", non-retryable"}): ${error.code || error.message}`
      );

      if (!retryable || isLastAttempt) break;
      await sleep(RETRY_DELAY_MS * (attempt + 1)); // linear backoff
    }
  }

  throw lastError;
}

const getWakatime = async (req, res) => {
  const apiKey = process.env.WAKATIME_APP_SECRET;

  // Fail fast if not configured.
  if (!apiKey) {
    return res.status(500).json({
      status: 500,
      message: "WakaTime API key is not configured (WAKATIME_APP_SECRET).",
    });
  }

  const now = Date.now();
  const cacheFresh = cache.data && now - cache.timestamp < CACHE_TTL_MS;

  // Serve fresh cache immediately.
  if (cacheFresh) {
    return res.status(200).json({
      status: 200,
      message: "Success (cached)",
      source: "cache",
      data: cache.data,
    });
  }

  try {
    const data = await fetchWakatimeStats(apiKey);

    cache = { data, timestamp: now };

    return res.status(200).json({
      status: 200,
      message: "Success",
      source: "live",
      data,
    });
  } catch (error) {
    console.error("WakaTime Service Error:", error.code || error.message);

    // Graceful degradation: serve stale cache if available.
    if (cache.data) {
      return res.status(200).json({
        status: 200,
        message: "Success (stale cache)",
        source: "stale-cache",
        data: cache.data,
      });
    }

    // No cache: report upstream unavailability clearly.
    const isTimeout = error.code === "ETIMEDOUT" || error.code === "ECONNABORTED";
    return res.status(503).json({
      status: 503,
      message: isTimeout
        ? "WakaTime is unreachable (timed out). Please try again later."
        : "Failed to fetch WakaTime stats.",
      error: error.code || error.message,
    });
  }
};

module.exports = { getWakatime };
