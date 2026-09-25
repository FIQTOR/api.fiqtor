const express = require('express');
const router = express.Router();
const { getGithubContributions } = require('../controllers/github.controller');
const { getWakatimeStats } = require('../controllers/wakatime.controller');
const { getCryptoPrices } = require('../services/crypto.service');
const { getSocialStats } = require('../services/social.service');
const { apiLimiter, statsLimiter } = require('../middleware/rate-limiter');

/**
 * Stats routes — mounted at /api/v1. Aggregates the read-only endpoints that
 * expose external/static data (GitHub, WakaTime, crypto, social).
 */

// GitHub contributions (external API — wrapped so upstream errors return JSON)
router.get('/github/contributions', statsLimiter, getGithubContributions);

// WakaTime all-time coding stats (external API — wrapped for graceful errors)
router.get('/wakatime', statsLimiter, getWakatimeStats);

// Static cryptocurrency prices (no third-party API — data lives in code)
router.get('/crypto', apiLimiter, getCryptoPrices);

// Static social stats (no scraping / third-party API)
router.get('/social/stats', apiLimiter, getSocialStats);

module.exports = router;
