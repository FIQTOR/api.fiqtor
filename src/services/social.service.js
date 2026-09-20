/**
 * Social stats service — serves STATIC follower data.
 *
 * No third-party API / scraping is used. Data lives in
 * `config/social.js`; edit that file and restart to update.
 */
const socialConfig = require('../config/social');

let lastUpdated = new Date().toISOString();

/**
 * GET /api/v1/social/stats
 * Returns static TikTok / Instagram follower counts.
 */
const getSocialStats = (req, res) => {
  return res.status(200).json({
    success: true,
    source: 'static',
    data: {
      tiktok: socialConfig.tiktok,
      instagram: socialConfig.instagram,
      lastUpdated,
    },
  });
};

module.exports = { getSocialStats };
