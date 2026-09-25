const express = require('express');
const router = express.Router();
const { processPrompt } = require('../controllers/ai.controller');
const { aiLimiter, aiDailyLimiter } = require('../middleware/rate-limiter');

/**
 * AI routes — mounted at /api/v1/ai.
 */

// AI chat endpoint: per-IP burst limit + daily quota (both protect API cost).
router.post('/generate', aiLimiter, aiDailyLimiter, processPrompt);

module.exports = router;
