import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processPrompt, setAiClient } from '../src/controllers/ai.controller.js';

/**
 * Unit tests for the AI controller's control flow: input validation, keyword
 * redirects, and SSE streaming. The Gemini client is injected via setAiClient
 * so no network calls happen (Vitest can't mock CommonJS `require`).
 */

const sendMessageStream = vi.fn();

const fakeClient = {
  chats: {
    create: () => ({ sendMessageStream }),
  },
};

/** Build a minimal mock Express req/res pair capturing SSE writes. */
function mockRes() {
  const writes = [];
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader: (k, v) => { res.headers[k] = v; },
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
    write(chunk) { writes.push(chunk); },
    end() {},
  };
  return { res, writes };
}

const parseEvents = (writes) =>
  writes
    .map((w) => w.replace(/^data: /, '').trim())
    .filter(Boolean)
    .map((w) => (w === '[DONE]' ? { done: true } : JSON.parse(w)));

describe('ai.controller processPrompt', () => {
  beforeEach(() => {
    sendMessageStream.mockReset();
    setAiClient(fakeClient);
  });

  afterEach(() => {
    setAiClient(null);
  });

  it('rejects empty input and file with 400', async () => {
    const { res } = mockRes();
    await processPrompt({ body: { input: '   ', history: [] } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('failed');
  });

  it('redirects to a local page when a nav keyword is present', async () => {
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'show me your project' } }, res);
    const events = parseEvents(writes);
    expect(events[0]).toEqual({ type: 'redirectLocal', url: '/projects' });
    expect(sendMessageStream).not.toHaveBeenCalled();
  });

  it('does NOT redirect when the page name appears inside a question', async () => {
    // Regression: `/talk` matched the token "contact", so every question
    // mentioning it was swallowed by a redirect and never reached the model.
    sendMessageStream.mockImplementation(async function* () {
      yield { text: 'You can reach me on WhatsApp.' };
    });
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'how do I contact you?' } }, res);
    const events = parseEvents(writes);
    expect(events.some((e) => e.type === 'redirectLocal')).toBe(false);
    expect(sendMessageStream).toHaveBeenCalled();
  });

  it('does NOT redirect to LinkedIn just because a sentence contains "in"', async () => {
    // Regression: SOCIAL_MAP had the token "in", so any sentence with that
    // ordinary word opened LinkedIn in a new tab.
    sendMessageStream.mockImplementation(async function* () {
      yield { text: 'The stack is React and Node.' };
    });
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'what is included in your stack?' } }, res);
    const events = parseEvents(writes);
    expect(events.some((e) => e.type === 'redirect')).toBe(false);
    expect(sendMessageStream).toHaveBeenCalled();
  });

  it('redirects social pages only for an explicit nav request', async () => {
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'open your instagram' } }, res);
    const events = parseEvents(writes);
    expect(events[0].type).toBe('redirect');
    expect(sendMessageStream).not.toHaveBeenCalled();
  });

  it('redirects in Indonesian for a nav command', async () => {
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'buka halaman kontak' } }, res);
    const events = parseEvents(writes);
    expect(events[0]).toEqual({ type: 'redirectLocal', url: '/talk' });
  });

  it('routes the intent matrix correctly (nav → redirect, question → model)', async () => {
    const cases = [
      // [input, expected redirect url | null]
      ['how do I contact you?', null],
      ['show me your projects', '/projects'],
      ['what have you built?', null],
      ['what is included in your stack?', null],
      ['tell me about your experience', null],
      ['open your instagram', 'REDIRECT'],
      ['buka halaman kontak', '/talk'],
      ['lihat proyek', '/projects'],
      ['go to career', '/career'],
      ['Can you build an ERP system?', null],
      ['How much does a website cost?', null],
      ['do you have certificates?', null],
      ['open linkedin', 'REDIRECT'],
      ['buka instagram', 'REDIRECT'],
      ['what is in your portfolio?', null],
      ['are you free for work', null],
      ['show me certificates', '/certification'],
    ];

    for (const [input, expected] of cases) {
      sendMessageStream.mockReset();
      sendMessageStream.mockImplementation(async function* () {
        yield { text: 'answered by model' };
      });
      const { res, writes } = mockRes();
      await processPrompt({ body: { input } }, res);
      const events = parseEvents(writes);
      const navEvent = events.find((e) => e.type === 'redirectLocal' || e.type === 'redirect');

      if (expected === null) {
        expect({ input, nav: !!navEvent }).toEqual({ input, nav: false });
        expect(sendMessageStream).toHaveBeenCalled();
      } else if (expected === 'REDIRECT') {
        expect({ input, type: navEvent && navEvent.type }).toEqual({ input, type: 'redirect' });
      } else {
        expect({ input, url: navEvent && navEvent.url }).toEqual({ input, url: expected });
      }
    }
  });

  it('streams text chunks and terminates with [DONE]', async () => {
    sendMessageStream.mockImplementation(async function* () {
      yield { text: 'Hello' };
      yield { text: ' world' };
    });

    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'hello there friend' } }, res);
    const events = parseEvents(writes);
    expect(events).toContainEqual({ text: 'Hello' });
    expect(events).toContainEqual({ text: ' world' });
    expect(events.at(-1)).toEqual({ done: true });
  });

  it('streams a safe error payload when the model call fails', async () => {
    sendMessageStream.mockRejectedValue(new Error('boom'));
    const { res, writes } = mockRes();
    await processPrompt({ body: { input: 'hello there friend' } }, res);
    const events = parseEvents(writes);
    expect(events[0]).toEqual({ status: 'failed', text: 'Internal server error.' });
  });
});
