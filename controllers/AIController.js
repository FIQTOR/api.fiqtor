/**
 * AI Controller - Optimized for Google Generative AI
 * Handles navigation filtering and intelligent responses with security guardrails.
 */
const { GoogleGenAI } = require("@google/genai");
const natural = require("natural");
const tokenizer = new natural.WordTokenizer();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const REDIRECT_MAP = {
  "/": ["home", "beranda", "landing"],
  "/talk": ["contact", "kontak", "business", "bicara"],
  "/#about": ["about", "tentang", "profil", "siapa"],
  "/#skills": ["skill", "kemampuan", "stack", "keahlian"],
  "/linktree": ["linktree", "links", "sosmed", "social"],
  "/career": ["career", "karir", "pengalaman", "kerja"],
  "/roadmap": ["roadmap", "belajar", "learn"],
  "/projects": ["project", "projek", "portfolio"],
  "/certification": ["sertifikat", "certificate", "award"],
};

const SOCIAL_MAP = {
  [process.env.SOCIAL_TIKTOK || ""]: ["tiktok", "tt"],
  [process.env.SOCIAL_INSTAGRAM || ""]: ["instagram", "ig", "insta"],
  [process.env.SOCIAL_YOUTUBE || ""]: ["youtube", "yt"],
  [process.env.SOCIAL_LINKEDIN || ""]: ["linkedin", "in"],
  [process.env.SOCIAL_GITHUB || ""]: ["github", "gh"],
};

const MAX_HISTORY = 10;
const MAX_INPUT_LENGTH = 1200; // Limit prompt length to prevent token abuse

// Configurable identity used to build the assistant system prompt.
const AI_BRAND = process.env.AI_BRAND_NAME || "the owner";
const AI_OWNER = process.env.AI_OWNER_NAME || "the owner";
const AI_ALIAS = process.env.AI_OWNER_ALIAS || AI_BRAND;
const AI_ROLE = process.env.AI_OWNER_ROLE || "Software Engineer";
const AI_COMPANY = process.env.AI_COMPANY_NAME || "";
const AI_COMPANY_URL = process.env.AI_COMPANY_URL || "";
const AI_BIO = process.env.AI_OWNER_BIO || "";

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

exports.processPrompt = async (req, res) => {
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
    const tokens = input ? tokenizer.tokenize(input.toLowerCase()) : [];

    // Redirect internal page
    if (input) {
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

      // Redirect social media
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
      const chat = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        history: [...SYSTEM_HISTORY, ...trimmedHistory],
      });

      stream = await chat.sendMessageStream({
        message: messagePayload,
      });
    } catch (error) {
      console.warn(
        "Model gemini-3.1-flash-lite-preview error, falling back to gemini-3-flash-preview:",
        error.message,
      );

      const fallbackChat = ai.chats.create({
        model: "gemini-3-flash-preview",
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
    console.error("Stream error:", error);

    res.write(
      `data: ${JSON.stringify({
        status: "failed",
        text: "Internal server error.",
      })}\n\n`,
    );

    res.end();
  }
};
