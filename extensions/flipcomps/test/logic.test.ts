import { describe, expect, it } from 'vitest';
import { fee, outcome, priceForProfit } from '../src/fees';
import { parsePrice, summarize } from '../src/stats';

const S = { price: 50, buyerShipping: 0, shipCost: 8, cost: 10 };
describe('fees (US, Nov 2026)', () => {
  it('eBay: 13.6% of total + $0.40 per order', () => expect(fee('ebay', S)).toBe(7.2));
  it('eBay: $0.30 per order at $10 or less', () => expect(fee('ebay', { ...S, price: 10 })).toBe(1.66));
  it('eBay: sneakers $150+ at 8%, no per-order fee', () => expect(fee('ebay', { ...S, price: 200, ebayCategory: 'sneakers' })).toBe(16));
  it('eBay: 2.35% above $7,500', () => expect(fee('ebay', { ...S, price: 10000 })).toBe(1079.15));
  it('Poshmark: $2.95 under $15, else 20%', () => { expect(fee('poshmark', { ...S, price: 12 })).toBe(2.95); expect(fee('poshmark', S)).toBe(10); });
  it('Mercari: 10% incl. buyer-paid shipping', () => expect(fee('mercari', { ...S, buyerShipping: 6 })).toBe(5.6));
  it('Depop: 3.3% + $0.45, boost +8%', () => { expect(fee('depop', S)).toBe(2.1); expect(fee('depop', { ...S, depopBoosted: true })).toBe(6.1); });
  it('Etsy: 6.5% + 3% + $0.25 + $0.20 listing', () => expect(fee('etsy', S)).toBe(5.2));
});

describe('profit', () => {
  it('Poshmark: buyer pays the label', () => expect(outcome('poshmark', S)).toMatchObject({ payout: 40, profit: 30 }));
  it('eBay: seller pays shipping', () => expect(outcome('ebay', S)).toMatchObject({ payout: 42.8, profit: 24.8 }));
  it('price needed for a target profit', () => {
    const p = priceForProfit('ebay', 20, { buyerShipping: 0, shipCost: 8, cost: 10 });
    expect(outcome('ebay', { ...S, price: p }).profit).toBeGreaterThanOrEqual(20);
    expect(outcome('ebay', { ...S, price: p - 0.01 }).profit).toBeLessThan(20);
  });
});

describe('sold stats', () => {
  it('median and middle half, outliers dropped', () => {
    const s = summarize([40, 42, 45, 48, 50, 52, 55, 58, 60, 900, 1])!;
    expect(s).toMatchObject({ count: 11, used: 9, median: 50, low: 40, high: 60 });
  });
  it('parses prices and ranges', () => {
    expect(parsePrice('$1,234.56')).toBe(1234.56);
    expect(parsePrice('$20.00 to $30.00')).toBe(25);
    expect(parsePrice('Free shipping')).toBeNull();
  });
});

import { queryFromTitle, soldSearchUrls } from '../src/page';
describe('search helpers', () => {
  it('cleans titles into a search query', () => expect(queryFromTitle('NWT Nike Air Max 90 Size 10 White/Black — FREE SHIPPING')).toBe('Nike Air Max 90 White Black'));
  it('builds sold-search links', () => {
    const u = soldSearchUrls('Nike Air Max 90');
    expect(u[0].url).toBe('https://www.ebay.com/sch/i.html?_nkw=Nike%20Air%20Max%2090&LH_Sold=1&LH_Complete=1');
    expect(u[1].url).toContain('availability=sold_out');
  });
});

describe('store screenshot numbers match the engine', () => {
  const s = { price: 85, buyerShipping: 0, shipCost: 10, cost: 20 };
  it.each([['ebay', 11.96, 43.04], ['poshmark', 17, 48], ['mercari', 8.5, 46.5], ['depop', 3.26, 51.74], ['etsy', 8.52, 46.48]] as const)('%s', (p, f, keep) => {
    expect(outcome(p, s)).toMatchObject({ fee: f, profit: keep });
  });
});
