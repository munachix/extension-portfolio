import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMetrics, decide, healthFlags, revenueStatus, scorecard, selfTraffic } from '../lib/engine.mjs';
import { normalizeRows, upsertRow, weekStart } from '../lib/data.mjs';
import { parseCsv, stringifyCsv } from '../lib/csv.mjs';
import { creemRevenue, lemonSqueezyRevenue, parseCwsExport, polarRevenue } from '../lib/import.mjs';
import { renderDashboard } from '../lib/dashboard.mjs';
import { formatReport } from '../lib/report.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const RULES = JSON.parse(readFileSync(path.join(dir, '../rules.json'), 'utf8'));
const ASOF = new Date('2026-11-02T12:00:00Z');
const DAY = 86400000;
const launchedDaysAgo = (d) => new Date(ASOF.getTime() - d * DAY).toISOString().slice(0, 10);

/** n weekly rows ending on ASOF's week, with defaults + overrides. */
function weeks(n, row = {}, last = {}) {
  return Array.from({ length: n }, (_, i) => {
    const w = new Date(ASOF.getTime() - (n - 1 - i) * 7 * DAY);
    return { week_start: weekStart(w), slug: 'x', impressions: 300, installs: 30, weekly_users: 100, uninstalls: 3, revenue_30d_usd: 0, sales_30d: 0, rating: 4.5, rating_count: 5, hours_spent: 0.5, ...row, ...(i === n - 1 ? last : {}) };
  });
}
const verdictFor = (days, rows, extra = {}) => {
  const m = computeMetrics(rows, { slug: 'x', name: 'X', launchDate: launchedDaysAgo(days), ...extra }, ASOF);
  return decide(m, RULES);
};

describe('$72 status', () => {
  const m = (rev) => ({ revenue30: rev });
  it('green ≥ 72, yellow ≥ 36, red below', () => {
    expect(revenueStatus(m(72), RULES)).toBe('green');
    expect(revenueStatus(m(36), RULES)).toBe('yellow');
    expect(revenueStatus(m(35.99), RULES)).toBe('red');
  });
});

describe('self-traffic', () => {
  it('≥500 green, 150–500 yellow, <150 red; final from week 8', () => {
    expect(selfTraffic({ impressions: 500, weeksSinceLaunch: 8 }, RULES)).toEqual({ level: 'green', final: true });
    expect(selfTraffic({ impressions: 150, weeksSinceLaunch: 3 }, RULES)).toEqual({ level: 'yellow', final: false });
    expect(selfTraffic({ impressions: 149, weeksSinceLaunch: 9 }, RULES).level).toBe('red');
    expect(selfTraffic({ impressions: null }, RULES).level).toBe('none');
  });
});

describe('checkpoints', () => {
  it('not launched → Launch it', () => {
    expect(decide(computeMetrics([], { slug: 'x', launchDate: null }, ASOF), RULES).action).toBe('Launch it');
  });
  it('before day 30 → too early', () => {
    expect(verdictFor(10, weeks(2)).verdict).toBe('early');
  });
  it('day 30: ≥100 installs and ≥1 sale → keep', () => {
    expect(verdictFor(35, weeks(5, { installs: 25 }, { sales_30d: 1 })).verdict).toBe('keep');
  });
  it('day 30: few installs → rewrite listing', () => {
    expect(verdictFor(35, weeks(5, { installs: 10 })).action).toMatch(/Rewrite title/);
  });
  it('day 30: installs but no sale → move paywall', () => {
    expect(verdictFor(35, weeks(5, { installs: 30 })).action).toMatch(/paywall/);
  });
  it('day 90: ≥ $36 → keep', () => {
    expect(verdictFor(100, weeks(8, {}, { revenue_30d_usd: 40 })).verdict).toBe('keep');
  });
  it('day 90: ≥ 500 weekly users with no revenue → keep', () => {
    expect(verdictFor(100, weeks(8, { weekly_users: 600 })).verdict).toBe('keep');
  });
  it('day 90: traffic OK, no sales → move paywall / price', () => {
    expect(verdictFor(100, weeks(8, { impressions: 400 })).action).toMatch(/paywall or change the price/);
  });
  it('day 90: low traffic → rewrite; after 2 rewrites → freeze', () => {
    expect(verdictFor(100, weeks(8, { impressions: 100 }), { listingRewrites: 1 }).action).toMatch(/Rewrite/);
    expect(verdictFor(100, weeks(8, { impressions: 100 }), { listingRewrites: 2 }).verdict).toBe('freeze');
  });
  it('day 180: ≥ $72 winner, $36–72 one more cycle, < $36 stop', () => {
    expect(verdictFor(200, weeks(8, {}, { revenue_30d_usd: 80 })).action).toMatch(/Invest/);
    expect(verdictFor(200, weeks(8, {}, { revenue_30d_usd: 50 })).action).toBe('One more improvement cycle');
    expect(verdictFor(200, weeks(8, {}, { revenue_30d_usd: 20 })).verdict).toBe('stop');
  });
});

describe('revenue per hour', () => {
  it('> 4h/month and < $72 after day 90 → freeze', () => {
    expect(verdictFor(120, weeks(8, { hours_spent: 2 }, { revenue_30d_usd: 50 })).verdict).toBe('freeze');
  });
  it("doesn't apply while building (before day 90)", () => {
    expect(verdictFor(40, weeks(5, { hours_spent: 10, installs: 30 }, { sales_30d: 1 })).verdict).toBe('keep');
  });
  it("doesn't apply when it earns ≥ $72", () => {
    expect(verdictFor(120, weeks(8, { hours_spent: 2 }, { revenue_30d_usd: 90 })).verdict).toBe('keep');
  });
});

describe('health flags', () => {
  const flags = (rows) => healthFlags(computeMetrics(rows, { slug: 'x', launchDate: launchedDaysAgo(60) }, ASOF), RULES).map((f) => f.id);
  it('uninstalls > 40% of installs', () => expect(flags(weeks(4, { installs: 10, uninstalls: 5 }))).toContain('uninstalls'));
  it('rating < 4.0', () => expect(flags(weeks(4, { rating: 3.8 }))).toContain('rating'));
  it('impressions down > 50% week over week', () => expect(flags(weeks(4, {}, { impressions: 100 }))).toContain('impressions'));
  it('healthy → none', () => expect(flags(weeks(4))).toEqual([]));
  it('a health flag overrides "keep" with a fix', () => {
    const d = verdictFor(100, weeks(8, { installs: 10, uninstalls: 6 }, { revenue_30d_usd: 50 }));
    expect(d.verdict).toBe('fix');
    expect(d.action).toMatch(/Fix what’s broken/);
  });
});

describe('portfolio + winner rule', () => {
  it('totals live extensions vs $72 each and fires the winner rule past $300', () => {
    const rows = [...weeks(4, { slug: 'a' }, { revenue_30d_usd: 320 }), ...weeks(4, { slug: 'b' }, { revenue_30d_usd: 10 })];
    const projects = [{ slug: 'a', name: 'A', launchDate: '2026-06-01' }, { slug: 'b', name: 'B', launchDate: '2026-06-01' }, { slug: 'c', name: 'C', launchDate: null }];
    const sc = scorecard(rows, projects, RULES, ASOF);
    expect(sc.portfolio).toMatchObject({ live: 2, total: 330, goal: 144, atTarget: 1 });
    expect(sc.portfolio.winnerRule.slugs).toEqual(['a']);
    expect(formatReport(sc, RULES)).toContain('pause new extensions');
    expect(renderDashboard(sc, RULES)).toContain('<title>Extension Scorecard</title>');
  });
});

describe('metrics', () => {
  it('install rate, paid conversion, uninstall %, $/hour, week-over-week', () => {
    const m = computeMetrics(weeks(4, { installs: 25, uninstalls: 5, hours_spent: 1 }, { impressions: 450, revenue_30d_usd: 40, sales_30d: 4 }), { slug: 'x', launchDate: launchedDaysAgo(28) }, ASOF);
    expect(m.installRate).toBeCloseTo((25 / 450) * 100);
    expect(m.paidConversion).toBe(4);
    expect(m.uninstallPct).toBe(20);
    expect(m.revenuePerHour).toBe(10);
    expect(m.wow.impressions).toBe(50);
    expect(m.daysSinceLaunch).toBe(28);
  });
});

describe('data + CSV', () => {
  it('round-trips quotes and commas', () => {
    expect(parseCsv(stringifyCsv([{ a: 'x,"y"', b: '2' }], ['a', 'b']))).toEqual([{ a: 'x,"y"', b: '2' }]);
  });
  it('blank cells are unknown (null), "$1,200" is 1200, bad numbers fail loudly', () => {
    expect(normalizeRows([{ week_start: '2026-11-02', slug: 'x', impressions: '', revenue_30d_usd: '$1,200' }])[0]).toMatchObject({ impressions: null, revenue_30d_usd: 1200 });
    expect(() => normalizeRows([{ week_start: '2026-11-02', slug: 'x', installs: 'lots' }])).toThrow(/not a number/);
    expect(() => normalizeRows([{ week_start: '11/2/2026', slug: 'x' }])).toThrow(/week_start/);
  });
  it('weeks start on Monday; upsert merges', () => {
    expect(weekStart(new Date('2026-11-05T10:00:00Z'))).toBe('2026-11-02');
    const rows = [];
    upsertRow(rows, 'x', '2026-11-02', { installs: 5 });
    upsertRow(rows, 'x', '2026-11-02', { impressions: 90 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ installs: 5, impressions: 90 });
    expect(() => upsertRow(rows, 'x', '2026-11-02', { instals: 1 })).toThrow(/Unknown column/);
  });
});

describe('importers', () => {
  const now = new Date('2026-11-05T00:00:00Z');
  it('Lemon Squeezy: paid orders for the product in the last 30 days', async () => {
    const page1 = { data: [
      { attributes: { created_at: '2026-11-01T00:00:00Z', status: 'paid', total_usd: 2900, first_order_item: { product_id: 7 } } },
      { attributes: { created_at: '2026-10-20T00:00:00Z', status: 'refunded', total_usd: 2900, first_order_item: { product_id: 7 } } },
      { attributes: { created_at: '2026-10-15T00:00:00Z', status: 'paid', total_usd: 499, first_order_item: { product_id: 8 } } },
    ], links: { next: 'https://api.lemonsqueezy.com/v1/orders?page=2' } };
    const page2 = { data: [
      { attributes: { created_at: '2026-10-10T00:00:00Z', status: 'paid', total_usd: 499, first_order_item: { product_id: 7 } } },
      { attributes: { created_at: '2026-09-01T00:00:00Z', status: 'paid', total_usd: 9900, first_order_item: { product_id: 7 } } },
    ], links: { next: 'https://never.example' } };
    const urls = [];
    const fetch = async (u) => { urls.push(u); return new Response(JSON.stringify(urls.length === 1 ? page1 : page2)); };
    expect(await lemonSqueezyRevenue({ apiKey: 'k', storeId: '1', productId: 7, now, fetch })).toEqual({ revenue: 33.99, sales: 2 });
    expect(urls).toHaveLength(2);
  });
  it('Polar: orders in the last 30 days', async () => {
    const body = { items: [{ created_at: '2026-11-01T00:00:00Z', net_amount: 3900, status: 'paid' }, { created_at: '2026-09-01T00:00:00Z', net_amount: 3900, status: 'paid' }], pagination: { max_page: 1 } };
    expect(await polarRevenue({ token: 't', organizationId: 'o', productId: 'p', now, fetch: async () => new Response(JSON.stringify(body)) })).toEqual({ revenue: 39, sales: 1 });
  });
  it('Creem: paid transactions for monthly + lifetime products, minus tax and refunds', async () => {
    const nowS = Math.floor(now.getTime() / 1000);
    const pages = {
      prod_month: { items: [{ created_at: nowS - 86400, amount_paid: 599, tax_amount: 0, refunded_amount: null, status: 'paid' }, { created_at: nowS - 40 * 86400, amount_paid: 599, status: 'paid' }], pagination: { next_page: null } },
      prod_life: { items: [{ created_at: (nowS - 3600) * 1000, amount_paid: 4290, tax_amount: 390, status: 'paid' }, { created_at: nowS - 7200, amount_paid: 3900, status: 'refunded', refunded_amount: 3900 }], pagination: { next_page: null } },
    };
    const urls = [];
    const fetch = async (u, init) => { urls.push(u); expect(init.headers['x-api-key']).toBe('creem_k'); return new Response(JSON.stringify(pages[new URL(u).searchParams.get('product_id')])); };
    expect(await creemRevenue({ apiKey: 'creem_k', productIds: ['prod_month', 'prod_life'], now, fetch })).toEqual({ revenue: 44.99, sales: 2 });
    expect(urls[0]).toMatch(/^https:\/\/api\.creem\.io\/v1\/transactions\/search\?product_id=prod_month/);
  });
  it('API errors explain what to check', async () => {
    await expect(lemonSqueezyRevenue({ apiKey: 'k', storeId: '1', now, fetch: async () => new Response('', { status: 401 }) })).rejects.toThrow(/LEMONSQUEEZY_API_KEY/);
  });
  it('Chrome Web Store export: daily rows become weeks', () => {
    const csv = 'Date,Store listing views,Installs,Uninstalls,Weekly users\n2026-11-02,40,5,1,90\n2026-11-03,60,7,0,95\n2026-11-09,30,2,1,99\n';
    const r = parseCwsExport(csv);
    expect(r.weeks).toEqual([
      { week: '2026-11-02', values: { impressions: 100, installs: 12, uninstalls: 1, weekly_users: 95 } },
      { week: '2026-11-09', values: { impressions: 30, installs: 2, uninstalls: 1, weekly_users: 99 } },
    ]);
  });
  it('unrecognised export says which headers it saw', () => {
    expect(() => parseCwsExport('Foo,Bar\n1,2\n')).toThrow(/Headers: Foo, Bar/);
  });
});
