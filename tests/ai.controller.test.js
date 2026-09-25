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
