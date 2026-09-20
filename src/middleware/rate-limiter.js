const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP
  message: {
    status: 429,
    error: "Too many requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Rate Limiter for AI endpoint
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 prompts per 15 minutes
  message: {
    status: 429,
    error: "AI rate limit reached. Please wait a few minutes before asking another question."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Rate Limiter for Contact Form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 submissions per 15 mins
  message: {
    status: 429,
    error: "Too many contact form submissions. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, aiLimiter, contactLimiter };
