/**
 * Routes aggregator — mounts every feature router onto the Express app.
 */
const publicRoutes = require('./public.routes');
const aiRoutes = require('./ai.routes');
const contactRoutes = require('./contact.routes');
const statsRoutes = require('./stats.routes');

/**
 * Configures all application routes.
 * @param {import('express').Express} app - Express application instance
 */
function configureRoutes(app) {
    // Health check (for monitoring / deploy verification)
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });

    // Public routes (outside /api)
    app.use('/v1/public', publicRoutes);

    // Versioned API routes
    app.use('/api/v1/ai', aiRoutes);
    app.use('/api/v1/contact', contactRoutes);
    app.use('/api/v1', statsRoutes);
}

module.exports = { configureRoutes };
