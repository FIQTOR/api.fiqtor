/**
 * Routes Module - Defines all API endpoints for the application with rate limiters
 */
const { processPrompt } = require('./controllers/AIController');
const { messagingService } = require('./services/ContactHandler');
const { fetchGithubContributions } = require('./services/Github');
const { GetWakatime } = require('./services/Wakatime');
const { getCryptoPrices } = require('./services/Crypto');
const { getSocialStats } = require('./services/UpdateStats');
const publicRoutes = require('./public');
const { apiLimiter, aiLimiter, contactLimiter } = require('./middleware/rateLimiter');

/**
 * Configures all application routes
 * @param {Object} app - Express application instance
 */
function configureRoutes(app) {
    // Public routes
    app.use('/v1/public', publicRoutes);

    // AI Chat Endpoint with strict AI rate limiter
    app.post('/api/v1/ai/generate', aiLimiter, processPrompt);

    // Contact with strict contact form rate limiter
    app.post("/api/v1/contact/send", contactLimiter, async (req, res) => {
        try {
            const { name, email, message } = req.body || {};
            if (!name || !email || !message) {
                return res.status(400).json({
                    status: "error",
                    message: "Name, email, and message are required."
                });
            }

            const result = await messagingService(req.body);
            res.status(200).json({
                status: "success",
                message: `Message sent via ${result.provider}`,
                data: result.info
            });
        } catch (error) {
            console.error("Contact Form Error:", error.message);
            res.status(500).json({
                status: "error",
                message: "Failed to send message."
            });
        }
    });

    // Github (external API — wrap so upstream errors return JSON, not a crash)
    app.get("/api/v1/github/contributions", apiLimiter, async (req, res, next) => {
        try {
            await fetchGithubContributions(req, res);
        } catch (error) {
            next(error);
        }
    });

    // Wakatime (external API — wrap so upstream errors return JSON, not a crash)
    app.get("/api/v1/wakatime", apiLimiter, async (req, res, next) => {
        try {
            await GetWakatime(req, res);
        } catch (error) {
            next(error);
        }
    });

    // Static cryptocurrency prices (no third-party API — data lives in code)
    app.get("/api/v1/crypto", apiLimiter, getCryptoPrices);

    // Static social stats (no scraping / third-party API)
    app.get("/api/v1/social/stats", apiLimiter, getSocialStats);
}

module.exports = { configureRoutes };
