import { describe, it, expect } from 'vitest';
const {
  mapMarketData,
  percentToRatio,
} = require('../src/services/crypto.service.js');

/**
 * Unit tests for the pure helpers in crypto.service.
 *
 * The network-facing `getCryptoPrices` degrades live → cache → stale → static
 * by design; here we cover the mapping that decides what prices it serves.
 */

const market = (id, price, pct24h, pct30d) => ({
  id,
  current_price: price,
  price_change_percentage_24h: pct24h,
  price_change_percentage_24h_in_currency: pct24h,
  price_change_percentage_30d_in_currency: pct30d,
});

describe('percentToRatio', () => {
  it('converts a percent change into a ratio', () => {
    expect(percentToRatio(5)).toBeCloseTo(1.05);
    expect(percentToRatio(-5)).toBeCloseTo(0.95);
    expect(percentToRatio(0)).toBe(1);
  });

  it('defaults to 1 for missing or junk values', () => {
    expect(percentToRatio(null)).toBe(1);
    expect(percentToRatio(undefined)).toBe(1);
    expect(percentToRatio('abc')).toBe(1);
  });
});

describe('mapMarketData', () => {
  it('maps CoinGecko markets into the public btc/eth/sol shape', () => {
    const result = mapMarketData([
      market('bitcoin', 82000, -1, -3.5),
      market('ethereum', 2400, 2, 10),
      market('solana', 104.27, 0, 0),
    ]);

    expect(result.btc).toEqual({
      code: 'BTC',
      rate: 82000,
      delta: { month: expect.closeTo(0.965, 5), day: expect.closeTo(0.99, 5) },
    });
    expect(result.eth.delta.month).toBeCloseTo(1.1);
    expect(result.eth.delta.day).toBeCloseTo(1.02);
    expect(result.sol.rate).toBe(104.27);
  });

  it('ignores extra coins from upstream', () => {
    const result = mapMarketData([
      market('bitcoin', 1, 0, 0),
      market('ethereum', 2, 0, 0),
      market('solana', 3, 0, 0),
      market('dogecoin', 4, 0, 0),
    ]);
    expect(Object.keys(result).sort()).toEqual(['btc', 'eth', 'sol']);
  });

  it('falls back to the non-currency 30d field when needed', () => {
    const result = mapMarketData([
      { ...market('bitcoin', 100, 1, 0), price_change_percentage_30d_in_currency: undefined, price_change_percentage_30d: 20 },
      market('ethereum', 2, 0, 0),
      market('solana', 3, 0, 0),
    ]);
    expect(result.btc.delta.month).toBeCloseTo(1.2);
  });

  it('returns null for invalid prices or malformed payloads', () => {
    expect(mapMarketData(null)).toBeNull();
    expect(mapMarketData({})).toBeNull();
    expect(
      mapMarketData([
        market('bitcoin', 0, 0, 0),
        market('ethereum', 2, 0, 0),
        market('solana', 3, 0, 0),
      ]),
    ).toBeNull();
    // Missing a coin entirely.
    expect(mapMarketData([market('bitcoin', 1, 0, 0)])).toBeNull();
  });
});
