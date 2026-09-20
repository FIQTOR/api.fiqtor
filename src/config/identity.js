/**
 * Identity & social configuration for the backend.
 *
 * ⚠️ This is STATIC, CODE-BASED configuration (NOT environment variables).
 *    It feeds the AI assistant system prompt and the social redirect map.
 *    Edit the values below and restart the server.
 *
 * Nothing here is secret (it is public branding/identity), so keeping it in
 * code avoids env-var drift and keeps `.env` reserved for true secrets only.
 */

/** Brand name shown to the AI assistant. */
const BRAND_NAME = "FIQTOR";

/** Owner's full name. */
const OWNER_NAME = "Taufiiqul Hakim";

/** Owner's alias / handle. */
const OWNER_ALIAS = "FIQTOR";

/** Owner's role / job title. */
const OWNER_ROLE = "AI & Software Engineer";

/** Short bio used by the AI assistant. */
const OWNER_BIO =
  "FIQTOR is an AI and software engineer from Indonesia building full stack web applications, AI automation, and business systems.";

/** Company / business brand (used by the AI when relevant). */
const COMPANY_NAME = "IARTY";
const COMPANY_URL = "https://iarty.biz.id";

/** Social profile URLs used by the AI for navigation intent matching. */
const SOCIAL = {
  tiktok: "https://www.tiktok.com/@fiqtor",
  instagram: "https://www.instagram.com/fiqtorr/",
  youtube: "https://www.youtube.com/@fiqtor",
  linkedin: "https://www.linkedin.com/in/fiqtor",
  github: "https://github.com/fiqtor",
};

const identityConfig = {
  brandName: BRAND_NAME,
  owner: {
    name: OWNER_NAME,
    alias: OWNER_ALIAS,
    role: OWNER_ROLE,
    bio: OWNER_BIO,
  },
  company: {
    name: COMPANY_NAME,
    url: COMPANY_URL,
  },
  social: SOCIAL,
};

module.exports = identityConfig;
