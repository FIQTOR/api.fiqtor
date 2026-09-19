/**
 * Static cryptocurrency market data.
 *
 * ⚠️ SECURITY / PRIVACY FIRST
 *   This project intentionally does NOT call any third-party crypto API.
 *   Instead of shipping a public API key to the browser (which anyone could
 *   steal), the values below are plain, hand-maintained, static data.
 *
 *   ➜ To update prices, edit the numbers here and restart the server.
 *   The shape below is what the frontend expects:
 *     { btc, eth, sol } where each coin has { rate, delta: { month } }
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
