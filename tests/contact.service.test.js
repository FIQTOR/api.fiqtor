import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagingService } from '../src/services/contact.service.js';

/**
 * Tests the WhatsApp-first, Email-fallback delivery flow.
 *
 * The service exposes a factory so we can inject fake transports — Vitest's
 * `vi.mock` cannot intercept CommonJS `require()` used inside the source.
 */

const payload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  type: 'consultation',
  message: 'Hello there',
};

describe('contact.service messagingService', () => {
  let httpClient;
  let sendMail;
  let messagingService;

  beforeEach(() => {
    httpClient = vi.fn();
    sendMail = vi.fn();
    messagingService = createMessagingService({
      httpClient,
      createTransport: () => ({ sendMail }),
    }).messagingService;
  });

  it('delivers via WhatsApp when the API succeeds', async () => {
    httpClient.mockResolvedValue({ data: { ok: true } });
    const result = await messagingService(payload);
    expect(result.provider).toBe('whatsapp');
    expect(result.success).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('falls back to email when WhatsApp fails', async () => {
    httpClient.mockRejectedValue(new Error('WA down'));
    sendMail.mockResolvedValue({ messageId: 'abc' });
    const result = await messagingService(payload);
    expect(result.provider).toBe('email');
    expect(result.success).toBe(true);
    expect(sendMail).toHaveBeenCalledOnce();
  });

  it('throws when both channels fail', async () => {
    httpClient.mockRejectedValue(new Error('WA down'));
    sendMail.mockRejectedValue(new Error('SMTP down'));
    await expect(messagingService(payload)).rejects.toThrow(
      /all available channels/i
    );
  });
});
