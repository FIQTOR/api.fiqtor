# 🖧 Backend — Portfolio API

Node.js + Express API powering the portfolio frontend. Handles the AI assistant, contact form (WhatsApp → Email fallback), and public stats (GitHub / WakaTime / social).

> 🔗 See the [root README](../README.md) for full-stack setup and configuration.

## ✨ Features

- 🤖 **AI Chat** — Google Gemini–powered assistant (`@google/genai`), identity from static config (`config/identityConfig.js`).
- 📬 **Contact Form** — Sends via WhatsApp Cloud API, with automatic Email (SMTP) fallback.
- 📊 **Public Stats** — GitHub contributions + WakaTime coding stats (with caching/retry).
- 💰 **Static Crypto & Social** — BTC/ETH/SOL prices and TikTok/Instagram follower counts are served from **static, hand-maintained** config files (no third-party API, no key to leak).
- 🛡️ **Security Hardening** — Helmet, HPP, CORS whitelist, and per-route rate limiting.
- 🧩 **Maybe unused** — Product & application-key CRUD controllers (optional; require Google Sheets).

## 🛠 Tech Stack

- **Runtime:** Node.js **20.x** (see `engines` in `package.json`)
- **Framework:** Express 4 (CommonJS)
- **AI:** `@google/genai` (Gemini), `groq-sdk` (optional)
- **Email:** Nodemailer · **HTTP:** Axios
- **Security:** Helmet, express-rate-limit, hpp, cors, cookie-parser
- **Data (optional):** `googleapis` (Google Sheets)

## ✅ Prerequisites

- Node.js **20.x+**
- npm
- (Optional) API keys for the integrations you enable — see env below.

## 📦 Installation

```bash
cd backend
npm install
cp .env.example .env    # then edit .env with your values
```

## ▶️ Running

```bash
npm run dev     # nodemon, auto-reload
npm start       # production
```

Server listens on `APP_PORT` (default **4000**).

## ⚙️ Environment Variables

All sensitive data is read from `backend/.env` (gitignored). See [`backend/.env.example`](.env.example) for the full documented list. Never commit real values.

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NODE_ENV` | ✅ | `development` / `production` |
| `APP_PORT` | ✅ | Server port (default `4000`) |
| `FRONTEND_HOST` | ✅ | Allowed CORS origin(s) |
| `GEMINI_API_KEY` | ✅ | Google Gemini key |
| `GROQ_API_KEY` | ⬜ | Optional Groq key |
| `AI_BRAND_NAME`, `AI_OWNER_NAME`, `AI_OWNER_ALIAS`, `AI_OWNER_ROLE`, `AI_OWNER_BIO`, `AI_COMPANY_NAME`, `AI_COMPANY_URL` | — | **Moved to code** → `config/identityConfig.js` |
| `SOCIAL_TIKTOK`, `SOCIAL_INSTAGRAM`, `SOCIAL_YOUTUBE`, `SOCIAL_LINKEDIN`, `SOCIAL_GITHUB` | — | **Moved to code** → `config/identityConfig.js` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` | ✅ | SMTP (Gmail App Password recommended) |
| `EMAIL_RECIPIENT` | ✅ | Receives contact-form notifications |
| `EMAIL_BUSINESS` | ⬜ | Optional public business email |
| `APP_ID`, `APP_SECRET`, `RECIPIENT_WAID`, `VERSION`, `PHONE_NUMBER_ID`, `ACCESS_TOKEN` | ⬜ | WhatsApp / Meta Cloud API |
| `GITHUB_USERNAME`, `GITHUB_TOKEN` | ⬜ | GitHub contribution stats |
| `WAKATIME_APP_SECRET` | ⬜ | WakaTime stats |
| `WAKATIME_TIMEOUT_MS`, `WAKATIME_MAX_RETRIES`, `WAKATIME_CACHE_TTL_MS` | ⬜ | WakaTime tuning (defaults 8000 / 2 / 300000) |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `SHEET_SECRET_KEY` | ⬜ | Google Sheets (optional) |
| `APP_KEY_HASH` | ✅ | bcrypt hash for app-key validation |

> 💡 **AI identity & social URLs are code-based.** They live in [`config/identityConfig.js`](config/identityConfig.js) (brand, owner, company, social links) — edit and restart. They are not secrets, so keeping them out of `.env` avoids drift.

> 💡 **Crypto prices & social stats need no env vars.** They are **static** and live in code — edit [`config/cryptoConfig.js`](config/cryptoConfig.js) and [`config/socialConfig.js`](config/socialConfig.js), then restart the server. This means a visitor can never discover an API key, because there isn't one.

> ⚠️ Keep the service-account JSON key and all secrets **out of the repo**. Only `.env.example` (with placeholders) is committed.

## 🔌 API Endpoints

Base URL: `http://localhost:4000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/generate` | AI chat completion |
| `POST` | `/api/v1/contact/send` | Contact form (WhatsApp → Email) |
| `GET`  | `/api/v1/github/contributions` | GitHub contribution stats |
| `GET`  | `/api/v1/wakatime` | WakaTime coding stats (cached) |
| `GET`  | `/api/v1/crypto` | Static BTC/ETH/SOL prices |
| `GET`  | `/api/v1/social/stats` | Static TikTok/Instagram stats |
| `GET`  | `/v1/public/stats` | Public social stats (same static data) |
| `GET`  | `/api/v1/products` | List products *(optional)* |
| `GET`  | `/api/v1/product/:row` | Get a product *(optional)* |
| `POST` | `/api/v1/product` | Create a product *(optional)* |
| `POST` | `/api/v1/product/:row/update` | Update a product *(optional)* |
| `POST` | `/api/v1/product/:row/delete` | Delete a product *(optional)* |
| `POST` | `/api/v1/s/product` | Search products *(optional)* |
| `POST` | `/api/v1/createentry` | Create application entry *(optional)* |
| `GET`  | `/api/v1/readentries` | Read application entries *(optional)* |
| `PUT`  | `/api/v1/updateentry` | Update application entry *(optional)* |
| `DELETE` | `/api/v1/deleteentry` | Delete application entry *(optional)* |

## 📂 Project Structure

```
backend/
├── config/           # CORS + static identity/crypto/social data
├── controllers/      # AIController (+ optional Product/Application controllers)
├── middleware/       # rate limiter, logger, error handler
├── services/         # ContactHandler, Github, Wakatime, Crypto, UpdateStats
├── public/           # public routes (no auth)
├── index.js          # 🚀 server entry point
├── routes.js         # API route definitions
├── .env.example      # env template (committed)
├── .env              # your secrets (gitignored)
└── vercel.json
```

## 🧪 Usage Examples

```javascript
// AI chat
const res = await fetch('/api/v1/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: 'Tell me about the projects' }),
});
const data = await res.json();
console.log(data.text);
```

```javascript
// WakaTime stats
const stats = await (await fetch('/api/v1/wakatime')).json();
console.log(stats.data.text);                  // "1,555 hrs 19 mins"
console.log(stats.data.range.start_text);      // "Tue Oct 24th 2023"
```

```javascript
// Static crypto prices (no API key involved)
const { data } = await (await fetch('/api/v1/crypto')).json();
console.log(data.btc.rate, data.btc.delta.month);

// Static social stats
const social = await (await fetch('/api/v1/social/stats')).json();
console.log(social.data.tiktok.followers);
```

## 🚢 Deployment

Vercel-ready (`vercel.json`). Import the `backend/` folder, add all env vars in **Settings → Environment Variables**, set `FRONTEND_HOST` to your production frontend URL, and deploy.

## 🔒 Security

- Never commit `.env` or `*.json` service-account keys — both are gitignored.
- Rotate any secret that was ever committed; purge git history (BFG / git-filter-repo).
- Keep Helmet, HPP, rate limiting, and the CORS whitelist enabled in production.
- All secrets must come from environment variables — **no hardcoded credentials in source**.
- **No third-party crypto/social API keys exist.** Prices and follower counts are static code data, so there is nothing for a visitor to discover. If you ever re-introduce a live provider, keep its key on the backend and proxy the request — never expose it to the browser.

## 📄 License

ISC.
