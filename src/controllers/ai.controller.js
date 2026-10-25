/**
 * AI Controller - Optimized for Google Generative AI
 * Handles navigation filtering and intelligent responses with security guardrails.
 */
const { GoogleGenAI } = require("@google/genai");
const identity = require("../config/identity");
const logger = require("../config/logger");

let aiClient = null;

/**
 * Lazily create (or return) the Gemini client. Created on first use so the
 * module can be imported in tests/environments without an API key present.
 * @returns {import('@google/genai').GoogleGenAI}
 */
function getAiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Override the Gemini client (test seam) — pass `null` to reset.
 * @param {object|null} client
 */
function setAiClient(client) {
  aiClient = client;
}

/**
 * Tokenize a string into lowercase word tokens for keyword matching.
 * A lightweight regex split (equivalent to `natural.WordTokenizer`) so we avoid
 * pulling in the ~14MB `natural` dependency just for this.
 * @param {string} text
 * @returns {string[]}
 */
const tokenize = (text) => text.toLowerCase().match(/[a-z0-9]+/g) || [];

/**
 * Navigation intents.
 *
 * A redirect is a *navigation*, so it may only fire when the visitor is
 * actually asking to be taken somewhere. Matching any single keyword used to
 * hijack real questions: `/talk` contains "contact", so "how do I contact
 * you?" never reached the model, and `SOCIAL_MAP` contained the token "in"
 * (LinkedIn) plus "ig"/"tt" — any sentence with the word "in" opened LinkedIn.
 *
 * Each intent therefore needs:
 *   - a VERB that asks for navigation ("show", "open", "go to", "buka"), AND
 *   - a NOUN naming the destination.
 * A bare noun is not enough; it is far more likely to be part of a question
 * ("tell me about your projects", "what does your stack look like?") which the
 * model should answer in prose instead of jumping the visitor to another page.
 */
const NAV_VERBS = new Set([
  "show", "see", "view", "open", "go", "goto", "visit", "browse", "take",
  "navigate", "jump", "bring", "redirect",
  "lihat", "tampilkan", "buka", "pergi", "kunjungi", "arahkan", "tuju",
]);

const NAV_PHRASES = [
  /\b(?:go|take me|bring me|jump|navigate)\s+to\b/,
  /\b(?:show|take|bring)\s+me\b/,
  /\b(?:bawa|antar)\s+saya\s+ke\b/,
  /\bpergi\s+ke\b/,
  /\bke\s+halaman\b/,
  /\bliat(?:h)?\s+(?:halaman|proyek|projek)\b/,
];

const REDIRECT_MAP = {
  "/": ["home", "homepage", "beranda", "landing"],
  "/talk": ["contact", "kontak", "hubungi", "talk"],
  "/#about": ["about", "tentang", "profil"],
  "/#skills": ["skill", "skills", "kemampuan", "keahlian"],
  "/linktree": ["linktree", "links", "tautan"],
  "/career": ["career", "karir", "pengalaman", "experience"],
  "/roadmap": ["roadmap", "belajar", "learn"],
  "/projects": ["project", "projects", "projek", "portfolio", "portofolio", "proyek"],
  "/certification": ["certificates", "certificate", "certifications", "sertifikat", "certification"],
};

/**
 * Social destinations. Kept to unambiguous names: `"in"`, `"ig"` and `"tt"`
 * were removed because they are ordinary words/abbreviations that appear in
 * unrelated sentences and caused phantom redirects.
 */
const SOCIAL_MAP = {
  [identity.social.tiktok]: ["tiktok"],
  [identity.social.instagram]: ["instagram", "insta"],
  [identity.social.youtube]: ["youtube"],
  [identity.social.linkedin]: ["linkedin"],
  [identity.social.github]: ["github"],
};

/**
 * True when the prompt reads as a navigation request ("show me projects")
 * rather than a question ("what have you built?").
 * @param {string} text
 * @param {string[]} tokens
 * @returns {boolean}
 */
const isNavigationIntent = (text, tokens) => {
  if (tokens.some((t) => NAV_VERBS.has(t))) return true;
  return NAV_PHRASES.some((re) => re.test(text));
};

const MAX_HISTORY = 10;
const MAX_INPUT_LENGTH = 1200; // Limit prompt length to prevent token abuse

/**
 * Gemini model ids, overridable per environment.
 *
 * These used to be hardcoded, which meant a retired/preview id could only be
 * fixed by redeploying. Reading them from env lets an operator switch models
 * (e.g. when a preview id is taken down) without a code change.
 * `PRIMARY` must be a *published* id — an invalid one fails on every request.
 */
const AI_MODEL_PRIMARY = process.env.AI_MODEL_PRIMARY || "gemini-2.5-flash-lite";
const AI_MODEL_FALLBACK = process.env.AI_MODEL_FALLBACK || "gemini-3-flash-preview";

// Identity used to build the assistant system prompt (from config, not env).
const AI_BRAND = identity.brandName;
const AI_OWNER = identity.owner.name;
const AI_ROLE = identity.owner.role;
const AI_COMPANY = identity.company.name;
const AI_COMPANY_URL = identity.company.url;
const AI_BIO = identity.owner.bio;

const SYSTEM_HISTORY = [
  {
    role: "user",
    parts: [
      {
        text: `
System instruction:

You are an AI assistant on ${AI_BRAND}'s personal website.

About ${AI_BRAND}:
- ${AI_ROLE}
${AI_BIO ? `- ${AI_BIO}\n` : ""}${AI_COMPANY ? `- Founder of ${AI_COMPANY}${AI_COMPANY_URL ? ` (${AI_COMPANY_URL})` : ""}\n` : ""}
STRICT SCOPE GUARDRAIL (MANDATORY):
- You MUST ONLY answer questions directly related to ${AI_BRAND} (${AI_OWNER}), their skills, portfolio, experience, projects, achievements, career, education${AI_COMPANY ? `, or their company ${AI_COMPANY}` : ""}.
- NEVER answer general knowledge questions, math problems, recipes, coding tutorials/troubleshooting for unrelated projects, or any topic unrelated to ${AI_BRAND}.
- If a question is outside this scope, politely decline and redirect to ${AI_BRAND}'s profile, portfolio, projects and skills.

Your job:
- Answer questions about ${AI_BRAND}'s skills, background, and work.
- Help visitors understand their technical projects and expertise.
- Be concise, professional, and tech-savvy.
`,
      },
    ],
  },
  {
    role: "model",
    parts: [
      {
        text: `Understood. I am the AI assistant for ${AI_BRAND}'s personal website.`,
      },
    ],
  },
];

const processPrompt = async (req, res) => {
  let { input, history = [], file } = req.body;

  if (typeof input === 'string') {
    input = input.trim().substring(0, MAX_INPUT_LENGTH);
  } else {
    input = "";
  }

  if (!input && !file) {
    return res.status(400).json({
      status: "failed",
      text: "Input or file is required.",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const tokens = input ? tokenize(input) : [];

    // Navigation shortcuts. Only taken when the prompt actually asks to go
    // somewhere — see `isNavigationIntent`. Anything else falls through to the
    // model, which answers questions about the same pages in prose.
    if (input) {
      const nav = isNavigationIntent(input.toLowerCase(), tokens);

      if (nav) {
        for (const [path, keywords] of Object.entries(REDIRECT_MAP)) {
          if (tokens.some((t) => keywords.includes(t))) {
            res.write(
              `data: ${JSON.stringify({
                type: "redirectLocal",
                url: path,
              })}\n\n`,
            );
            return res.end();
          }
        }

        for (const [url, keywords] of Object.entries(SOCIAL_MAP)) {
          if (tokens.some((t) => keywords.includes(t))) {
            res.write(
              `data: ${JSON.stringify({
                type: "redirect",
                platform: url,
                text: `Opening ${url}...`,
              })}\n\n`,
            );
            return res.end();
          }
        }
      }
    }

    const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];

    let messagePayload;
    if (file && file.data && file.mimeType && typeof file.data === 'string') {
      const inlineDataPart = {
        inlineData: {
          data: file.data,
          mimeType: String(file.mimeType),
        },
      };
      messagePayload = input ? [inlineDataPart, input] : [inlineDataPart];
    } else {
      messagePayload = input;
    }

    let stream;
    try {
      const chat = getAiClient().chats.create({
        // "gemini-3.1-flash-lite-preview" is NOT a published model id: every
        // request used to fail here and silently retry on the fallback, which
        // doubled latency and billed a wasted call. The fast/lite tier is
        // `gemini-2.5-flash-lite`; the heavier one stays as the fallback.
        model: AI_MODEL_PRIMARY,
        history: [...SYSTEM_HISTORY, ...trimmedHistory],
      });

      stream = await chat.sendMessageStream({
        message: messagePayload,
      });
    } catch (error) {
      logger.warn(
        { err: error.message, model: AI_MODEL_PRIMARY },
        `primary model failed, falling back to ${AI_MODEL_FALLBACK}`,
      );

      const fallbackChat = getAiClient().chats.create({
        model: AI_MODEL_FALLBACK,
        history: [...SYSTEM_HISTORY, ...trimmedHistory],
      });

      stream = await fallbackChat.sendMessageStream({
        message: messagePayload,
      });
    }

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    logger.error({ err: error }, "AI stream error");

    res.write(
      `data: ${JSON.stringify({
        status: "failed",
        text: "Internal server error.",
      })}\n\n`,
    );

    res.end();
  }
};

module.exports = { processPrompt, setAiClient };
