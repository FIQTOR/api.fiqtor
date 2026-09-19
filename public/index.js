const express = require('express');
const router = express.Router();
const { getSocialStats } = require('../services/UpdateStats');

/**
 * Public Routes
 * These endpoints are accessible without authentication
 * and provide general information like social statistics.
 */

// Social Media Stats Endpoint
router.get('/stats', getSocialStats);

module.exports = router;
