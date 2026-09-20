/**
 * Crypto service — serves STATIC market data.
 *
 * No third-party API is called, so there is no API key to leak and no rate
 * limit to hit. Data comes from `config/crypto.js`; edit that file to
 * update the prices.
 */
const cryptoConfig = require('../config/crypto');

/**
 * GET /api/v1/crypto
 * Returns static USD prices for BTC / ETH / SOL.
 */
const getCryptoPrices = (req, res) => {
  return res.status(200).json({
    status: "success",
    source: "static",
    data: cryptoConfig,
  });
};

module.exports = { getCryptoPrices };
