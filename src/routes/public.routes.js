const express = require('express');
const router = express.Router();
const { getSocialStats } = require('../services/social.service');

/**
 * Public routes — mounted at /v1/public (outside /api).
 * These endpoints are accessible without authentication and expose
 * general information such as social statistics.
 */

// Social media stats endpoint
router.get('/stats', getSocialStats);

module.exports = router;
