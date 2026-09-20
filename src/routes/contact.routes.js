const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contact.controller');
const { contactLimiter } = require('../middleware/rate-limiter');

/**
 * Contact routes — mounted at /api/v1/contact.
 */

// Contact form with a strict contact rate limiter
router.post('/send', contactLimiter, sendContactMessage);

module.exports = router;
