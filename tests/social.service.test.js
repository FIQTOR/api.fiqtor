import { describe, it, expect } from 'vitest';
const {
  parseCompactNumber,
  parseInstagramDescription,
  withFallback,
} = require('../src/services/social.service.js');

/**
 * Unit tests for the pure helpers in social.service.
 *
 * The network-facing `getSocialStats` degrades to cache/default by design; here
 * we cover the parsing + fallback logic that decides what numbers it serves.
 */

describe('parseCompactNumber', () => {
  it('parses plain and thousands-separated integers', () => {
    expect(parseCompactNumber('671')).toBe(671);
    expect(parseCompactNumber('2,006')).toBe(2006);
  });

  it('parses compact K/M/B suffixes', () => {
    expect(parseCompactNumber('1.2K')).toBe(1200);
    expect(parseCompactNumber('3M')).toBe(3000000);
    expect(parseCompactNumber('1.5B')).toBe(1500000000);
  });

  it('returns null for junk input', () => {
    expect(parseCompactNumber('')).toBeNull();
    expect(parseCompactNumber(undefined)).toBeNull();
    expect(parseCompactNumber('abc')).toBeNull();
  });
});

describe('parseInstagramDescription', () => {
  it('extracts followers + following from an og:description', () => {
    const html = `<meta property="og:description" content="694 Followers, 586 Following, 7 Posts - See Instagram photos" />`;
    expect(parseInstagramDescription(html)).toEqual({
      followers: 694,
      following: 586,
    });
  });

  it('handles compact values', () => {
    const html = `<meta property="og:description" content="1.2M Followers, 300 Following, 10 Posts" />`;
    expect(parseInstagramDescription(html)).toEqual({
      followers: 1200000,
      following: 300,
    });
  });

  it('returns null when the meta tag is missing', () => {
    expect(parseInstagramDescription('<html></html>')).toBeNull();
  });

  it('returns null when the description lacks the counts', () => {
    const html = `<meta property="og:description" content="Just a bio" />`;
    expect(parseInstagramDescription(html)).toBeNull();
  });
});

describe('withFallback', () => {
  const fallback = { followers: 2006, following: 49 };

  it('prefers fetched values when present', () => {
    expect(withFallback({ followers: 10, following: 5 }, fallback)).toEqual({
      followers: 10,
      following: 5,
    });
  });

  it('uses the fallback when fetched is null', () => {
    expect(withFallback(null, fallback)).toEqual(fallback);
  });

  it('merges partial fetched values over the fallback', () => {
    expect(withFallback({ followers: 10 }, fallback)).toEqual({
      followers: 10,
      following: 49,
    });
  });

  it('carries likes through when the default defines it', () => {
    expect(
      withFallback({ followers: 10, following: 5 }, { followers: 1, following: 2, likes: 130000 })
    ).toEqual({ followers: 10, following: 5, likes: 130000 });
  });

  it('does not add a likes key when neither side defines it', () => {
    expect(withFallback({ followers: 10, following: 5 }, fallback)).not.toHaveProperty(
      'likes'
    );
  });
});
