import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

/**
 * Route-level tests for the Express app. External services (Gemini, WhatsApp,
 * SMTP, GitHub, WakaTime) are mocked so tests stay hermetic and fast.
 */

describe('HTTP routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  it('GET /health returns ok with uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /api/v1/crypto returns static prices', async () => {
    const res = await request(app).get('/api/v1/crypto');
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });

  it('POST /api/v1/contact/send rejects a missing payload with 400', async () => {
    const res = await request(app).post('/api/v1/contact/send').send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /api/v1/ai/generate rejects empty input with 400', async () => {
    const res = await request(app).post('/api/v1/ai/generate').send({ input: '' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failed');
  });
});

describe('security headers', () => {
  it('sets Helmet security headers on responses', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('rate limiting', () => {
  it('applies standard RateLimit headers', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('returns 429 once the contact limiter is exceeded', async () => {
    const app = createApp();
    // contactLimiter max = 10 per window; the 11th request must be blocked.
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await request(app).post('/api/v1/contact/send').send({});
    }
    expect(last.status).toBe(429);
    expect(last.body.status).toBe(429);
  });
});
