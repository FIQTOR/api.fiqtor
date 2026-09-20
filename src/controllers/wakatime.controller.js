const { getWakatime } = require('../services/wakatime.service');

/**
 * GET /api/v1/wakatime
 * Wraps the WakaTime service so upstream errors are forwarded to the global
 * error handler (returning JSON instead of crashing the process).
 */
async function getWakatimeStats(req, res, next) {
    try {
        await getWakatime(req, res);
    } catch (error) {
        next(error);
    }
}

module.exports = { getWakatimeStats };
