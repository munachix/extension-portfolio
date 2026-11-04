/**
 * Importers:
 *  - revenue from the Creem / Lemon Squeezy / Polar APIs (last 30 days, per product)
 *  - a Chrome Web Store dashboard CSV export (daily rows -> weekly)
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from './csv.mjs';
import { weekStart } from './data.mjs';

const DAY = 86400000;

/** Read KEY=value lines from .env (repo root). Real environment variables win. */
export async function loadEnv(root) {
  const file = path.join(root, '.env');
  const env = {};
  if (existsSync(file)) {
    for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...env, ...process.env };
}

/** Lemon Squeezy: paid orders for one product in the last 30 days. */
export async function lemonSqueezyRevenue({ apiKey, storeId, productId, now = new Date(), fetch: f = fetch }) {
  const since = now.getTime() - 30 * DAY;
  let url = `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${encodeURIComponent(storeId)}&page[size]=100`;
  let revenue = 0, sales = 0;
  while (url) {
    const res = await f(url, { headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(`Lemon Squeezy returned ${res.status}. Check LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID.`);
    const body = await res.json();
    let older = false;
    for (const o of body.data ?? []) {
      const a = o.attributes ?? {};
      if (Date.parse(a.created_at) < since) { older = true; continue; }
      if (a.status !== 'paid') continue; // refunded/pending don't count
      if (productId != null && String(a.first_order_item?.product_id) !== String(productId)) continue;
      revenue += (a.total_usd ?? 0) / 100;
      sales += 1;
    }
    // Orders come newest first; stop paging once we're past 30 days.
    url = older ? null : body.links?.next ?? null;
  }
  return { revenue: Math.round(revenue * 100) / 100, sales };
}

/** Polar: orders for one product in the last 30 days. Amounts are in cents. */
export async function polarRevenue({ token, organizationId, productId, now = new Date(), fetch: f = fetch }) {
  const since = now.getTime() - 30 * DAY;
  let page = 1, maxPage = 1, revenue = 0, sales = 0;
  do {
    const q = new URLSearchParams({ organization_id: organizationId, limit: '100', page: String(page), sorting: '-created_at' });
    if (productId) q.set('product_id', productId);
    const res = await f(`https://api.polar.sh/v1/orders/?${q}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Polar returned ${res.status}. Check POLAR_ACCESS_TOKEN and POLAR_ORGANIZATION_ID.`);
    const body = await res.json();
    maxPage = body.pagination?.max_page ?? 1;
    let older = false;
    for (const o of body.items ?? []) {
      if (Date.parse(o.created_at) < since) { older = true; continue; }
      if (o.status && !['paid', 'succeeded'].includes(o.status)) continue;
      const cents = o.net_amount ?? o.subtotal_amount ?? o.amount ?? 0;
      revenue += cents / 100;
      sales += 1;
    }
    if (older) break;
    page += 1;
  } while (page <= maxPage);
  return { revenue: Math.round(revenue * 100) / 100, sales };
}

/**
 * Creem: paid transactions for the given products in the last 30 days.
 * Revenue = amount paid − tax − refunds (before Creem's own fee). Amounts are in cents.
 */
export async function creemRevenue({ apiKey, productIds, now = new Date(), fetch: f = fetch }) {
  const since = now.getTime() - 30 * DAY;
  const base = apiKey.startsWith('creem_test_') ? 'https://test-api.creem.io' : 'https://api.creem.io';
  let revenue = 0, sales = 0;
  for (const productId of productIds) {
    for (let page = 1; page <= 50; page++) {
      const q = new URLSearchParams({ product_id: productId, page_number: String(page), page_size: '100' });
      const res = await f(`${base}/v1/transactions/search?${q}`, { headers: { Accept: 'application/json', 'x-api-key': apiKey } });
      if (!res.ok) throw new Error(`Creem returned ${res.status}. Check CREEM_API_KEY in .env.`);
      const body = await res.json();
      for (const t of body.items ?? []) {
        const at = typeof t.created_at === 'number' ? (t.created_at < 1e12 ? t.created_at * 1000 : t.created_at) : Date.parse(t.created_at);
        if (at < since) continue;
        if (!['paid', 'partialRefund'].includes(t.status)) continue;
        revenue += ((t.amount_paid ?? t.amount ?? 0) - (t.tax_amount ?? 0) - (t.refunded_amount ?? 0)) / 100;
        sales += 1;
      }
      if (!body.pagination?.next_page) break;
    }
  }
  return { revenue: Math.round(revenue * 100) / 100, sales };
}

/** Revenue for every project that has a provider product id. */
export async function importRevenue(projects, env, { now = new Date(), fetch: f = fetch } = {}) {
  const results = [];
  for (const p of projects) {
    if (p.creemProductIds?.length) {
      if (!env.CREEM_API_KEY) throw new Error('Add CREEM_API_KEY to .env (Creem dashboard → Developers → API keys)');
      results.push({ slug: p.slug, provider: 'Creem', ...(await creemRevenue({ apiKey: env.CREEM_API_KEY, productIds: p.creemProductIds, now, fetch: f })) });
    } else if (p.lemonsqueezyProductId != null) {
      if (!env.LEMONSQUEEZY_API_KEY || !env.LEMONSQUEEZY_STORE_ID) throw new Error('Add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID to .env');
      results.push({ slug: p.slug, provider: 'Lemon Squeezy', ...(await lemonSqueezyRevenue({ apiKey: env.LEMONSQUEEZY_API_KEY, storeId: env.LEMONSQUEEZY_STORE_ID, productId: p.lemonsqueezyProductId, now, fetch: f })) });
    } else if (p.polarProductId) {
      if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_ORGANIZATION_ID) throw new Error('Add POLAR_ACCESS_TOKEN and POLAR_ORGANIZATION_ID to .env');
      results.push({ slug: p.slug, provider: 'Polar', ...(await polarRevenue({ token: env.POLAR_ACCESS_TOKEN, organizationId: env.POLAR_ORGANIZATION_ID, productId: p.polarProductId, now, fetch: f })) });
    }
  }
  return results;
}

/**
 * Chrome Web Store dashboard export → weekly numbers.
 * The export's exact headers vary, so columns are matched loosely by name.
 * Rows are summed per week (Monday start); "users" uses the week's last value.
 */
const COLS = {
  date: /^(date|day|week)/i,
  impressions: /impression|listing views|page views|store views/i,
  installs: /^install|installs$|new install/i,
  uninstalls: /uninstall/i,
  weekly_users: /weekly users|active users|^users$|weekly active/i,
};
export function parseCwsExport(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('The file has no rows.');
  const headers = Object.keys(rows[0]);
  const pick = (re, not) => headers.find((h) => re.test(h) && !(not && not.test(h)));
  const col = {
    date: pick(COLS.date),
    impressions: pick(COLS.impressions),
    installs: pick(COLS.installs, /uninstall/i),
    uninstalls: pick(COLS.uninstalls),
    weekly_users: pick(COLS.weekly_users),
  };
  if (!col.date) throw new Error(`Couldn't find a date column. Headers: ${headers.join(', ')}`);
  const found = Object.entries(col).filter(([k, v]) => k !== 'date' && v).map(([k]) => k);
  if (!found.length) throw new Error(`Couldn't find impressions/installs/users columns. Headers: ${headers.join(', ')}`);
  const num = (v) => { const n = Number(String(v ?? '').replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
  const weeks = new Map();
  for (const r of rows) {
    const t = Date.parse(r[col.date]);
    if (Number.isNaN(t)) continue;
    const wk = weekStart(new Date(t));
    const w = weeks.get(wk) ?? { lastDate: 0 };
    for (const k of ['impressions', 'installs', 'uninstalls']) if (col[k]) w[k] = (w[k] ?? 0) + num(r[col[k]]);
    if (col.weekly_users && t >= w.lastDate) { w.weekly_users = num(r[col.weekly_users]); w.lastDate = t; }
    weeks.set(wk, w);
  }
  return { columns: found, weeks: [...weeks].map(([week, w]) => { delete w.lastDate; return { week, values: w }; }) };
}
