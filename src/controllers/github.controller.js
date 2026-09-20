const { fetchGithubContributions } = require('../services/github.service');

/**
 * GET /api/v1/github/contributions
 * Wraps the GitHub service so upstream errors are forwarded to the global
 * error handler (returning JSON instead of crashing the process).
 */
async function getGithubContributions(req, res, next) {
    try {
        await fetchGithubContributions(req, res);
    } catch (error) {
        next(error);
    }
}

module.exports = { getGithubContributions };
