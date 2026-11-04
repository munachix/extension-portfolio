import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import { DEFAULT_FEES, type FeeTable } from './fees';

export interface Prefs { cost: number; shipCost: number; buyerShipping: number; target: number; ebayCategory: keyof FeeTable['ebay']['categories']; depopBoosted: boolean }
export interface Saved { title: string; url: string; platform: string; cost: number; price: number; savedAt: string; soldMedian?: number }
export const DEFAULT_PREFS: Prefs = { cost: 0, shipCost: 8, buyerShipping: 0, target: 20, ebayCategory: 'most', depopBoosted: false };
export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productIds: (cfg.license as { productIds?: string[] }).productIds, checkoutUrl: cfg.license.checkoutUrl };
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const FREE_SOLD_PER_DAY = 10;
export const PRO_FEATURES = ['Unlimited sold-page summaries (free: 10 searches a day)', '“Price for my profit” on every platform', 'Inventory log with cost and target price, CSV export', 'Edit fee rates: categories, boosted and promoted listings'];
export const FREE_FEATURES = 'the fee and profit table on every eBay, Poshmark, Mercari, Depop and Etsy listing, sold-search links, and 10 sold-page summaries a day.';

/**
 * Free sold summaries: 10 different searches per day. Re-opening a search
 * already counted today is free, so scrolling or re-sorting never uses one up.
 */
export async function useSoldSummary(query: string, today = new Date().toISOString().slice(0, 10)): Promise<{ ok: boolean; left: number }> {
  const q = query.trim().toLowerCase() || '(all)';
  let res = { ok: false, left: 0 };
  await store.update<{ day: string; queries: string[] }>('soldAllowance', { day: today, queries: [] }, (a) => {
    const cur = a.day === today ? a : { day: today, queries: [] };
    if (cur.queries.includes(q)) { res = { ok: true, left: FREE_SOLD_PER_DAY - cur.queries.length }; return cur; }
    if (cur.queries.length >= FREE_SOLD_PER_DAY) { res = { ok: false, left: 0 }; return cur; }
    const next = { day: today, queries: [...cur.queries, q] };
    res = { ok: true, left: FREE_SOLD_PER_DAY - next.queries.length };
    return next;
  });
  return res;
}
export const prefs = {
  get: async () => ({ ...DEFAULT_PREFS, ...(await store.get<Partial<Prefs>>('prefs', {})) }),
  set: async (p: Partial<Prefs>) => store.set('prefs', { ...(await prefs.get()), ...p }),
};
export const fees = {
  get: async (): Promise<FeeTable> => ({ ...DEFAULT_FEES, ...(await store.get<Partial<FeeTable>>('fees', {})) }) as FeeTable,
  set: (t: Partial<FeeTable>) => store.set('fees', t),
  reset: () => store.remove('fees'),
};
export const inventory = {
  list: () => store.get<Saved[]>('inventory', []),
  add: (s: Saved) => store.update<Saved[]>('inventory', [], (l) => [s, ...l.filter((x) => x.url !== s.url)]),
};
