/**
 * LAST-RESORT fallback cryptocurrency data (not the primary source).
 *
 * Prices are normally fetched LIVE from CoinGecko inside
 * `src/services/crypto.service.js`; this file is only served when upstream has
 * never answered successfully (cold start + outage). Nothing here is secret —
 * the API call happens server-side, so no key ever reaches the browser.
 *
 * The shape below is what the frontend expects:
 *   { btc, eth, sol } where each coin has { rate, delta: { month, day } }
 *
 *   `delta.month` is a RATIO relative to 30 days ago (1 = unchanged):
 *     - 1.05  → +5%  (green, up)
 *     - 0.95  → -5%  (red, down)
 */

const cryptoConfig = {
  // Bitcoin (USD)
  btc: {
    code: "BTC",
    rate: 97000,
    delta: { month: 1.08 },
  },
  // Ethereum (USD)
  eth: {
    code: "ETH",
    rate: 3400,
    delta: { month: 1.04 },
  },
  // Solana (USD)
  sol: {
    code: "SOL",
    rate: 190,
    delta: { month: 0.97 },
  },
};

module.exports = cryptoConfig;
