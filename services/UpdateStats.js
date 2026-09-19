const axios = require('axios');

// Kita gunakan caching agar tidak membebani limit Behold (tier gratis biasanya 1200 request/bulan)
let socialCache = {
    tiktok: { followers: 2006, following: 49 },
    instagram: { followers: 671, following: 572 },
    lastUpdated: null
};

const getSocialStats = async (req, res) => {
    const CACHE_DURATION = 1000 * 60 * 30; // Update setiap 30 menit

    if (socialCache.lastUpdated && (Date.now() - new Date(socialCache.lastUpdated) < CACHE_DURATION)) {
        return res.status(200).json({ success: true, data: socialCache, source: 'cache' });
    }

    try {
        // --- 1. Ambil Instagram via Behold ---
        try {
            // Ganti URL dengan URL API dari dashboard Behold kamu
            const BEHOLD_URL = process.env.BEHOLD_API_URL;
            const igRes = await axios.get(BEHOLD_URL);

            socialCache.instagram = {
                followers: igRes.data.followers_count,
                following: igRes.data.follows_count || 572
            };
        } catch (err) {
            console.error("IG Behold Error:", err.message);
        }

        // --- 2. Ambil TikTok via Scraping (Tetap pakai cara lama karena gratis) ---
        try {
            const tiktokUser = process.env.SOCIAL_TIKTOK_USERNAME || process.env.AI_OWNER_ALIAS || "";
            const ttRes = await axios.get(`https://www.tiktok.com/@${tiktokUser}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            });
            const ttF = ttRes.data.match(/"followerCount":(\d+)/)?.[1];
            const ttG = ttRes.data.match(/"followingCount":(\d+)/)?.[1];

            if (ttF) socialCache.tiktok.followers = parseInt(ttF);
            if (ttG) socialCache.tiktok.following = parseInt(ttG);
        } catch (err) {
            console.error("TikTok Scrape Error:", err.message);
        }

        socialCache.lastUpdated = new Date().toISOString();

        res.status(200).json({
            success: true,
            data: socialCache,
            source: 'live'
        });

    } catch (error) {
        res.status(200).json({ success: true, data: socialCache, message: "Fallback data used" });
    }
};

module.exports = { getSocialStats };