import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import type { CC } from './countries';

export interface Settings {
  /** Free: the first one is used. Pro: all. */
  countries: CC[];
  listBadges: boolean;
  hideNonSponsors: boolean;
}

export interface SavedCompany { name: string; results: string; savedAt: string; url: string }

export const LICENSE: LicenseConfig = {
  provider: cfg.license.provider as LicenseConfig['provider'],
  licenseServerUrl: cfg.license.licenseServerUrl,
  productId: cfg.license.productId ?? undefined,
  checkoutUrl: cfg.license.checkoutUrl,
};
export const DATA_BASE = cfg.dataBaseUrl.replace(/\/$/, '');
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = [
  'All 4 countries at once: US, UK, Canada, Netherlands',
  'US: H-1B filings per year and median salary offered',
  'Badges on search results, and hide companies that don’t sponsor',
  'Search any company, save a list and export it to CSV',
];

const KEY = 'settings';
export const defaults = (): Settings => ({ countries: ['us'], listBadges: true, hideNonSponsors: false });

export async function loadSettings(): Promise<Settings> {
  return { ...defaults(), ...(await store.get<Partial<Settings>>(KEY, {})) };
}
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await store.set(KEY, next);
  return next;
}
export function activeCountries(s: Settings, pro: boolean): CC[] {
  return pro ? s.countries : s.countries.slice(0, 1);
}

export const saved = {
  list: () => store.get<SavedCompany[]>('saved', []),
  add: (c: SavedCompany) => store.update<SavedCompany[]>('saved', [], (l) => [c, ...l.filter((x) => x.name !== c.name)]),
};
