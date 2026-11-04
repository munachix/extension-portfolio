import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import { DEFAULT_FEES, type FeeTable } from './fees';

export interface Prefs { cost: number; shipCost: number; buyerShipping: number; target: number; ebayCategory: keyof FeeTable['ebay']['categories']; depopBoosted: boolean }
export interface Saved { title: string; url: string; platform: string; cost: number; price: number; savedAt: string; soldMedian?: number }
export const DEFAULT_PREFS: Prefs = { cost: 0, shipCost: 8, buyerShipping: 0, target: 20, ebayCategory: 'most', depopBoosted: false };
export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productId: cfg.license.productId ?? undefined, checkoutUrl: cfg.license.checkoutUrl };
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = ['Sold-page summary: median, middle-half range, outliers removed', '“Price for my profit” on every platform', 'Inventory log with cost and target price, CSV export', 'Edit fee rates: categories, boosted and promoted listings'];
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
