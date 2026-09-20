const express = require('express');
const router = express.Router();
const { processPrompt } = require('../controllers/ai.controller');
const { aiLimiter } = require('../middleware/rate-limiter');

/**
 * AI routes — mounted at /api/v1/ai.
 */

// AI chat endpoint with a strict AI rate limiter
router.post('/generate', aiLimiter, processPrompt);

module.exports = router;
