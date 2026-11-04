import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import type { CC } from './countries';

export interface Settings {
  /** Countries to check (all of them on every plan). */
  countries: CC[];
  listBadges: boolean;
  hideNonSponsors: boolean;
}

export interface SavedCompany { name: string; results: string; savedAt: string; url: string }

export const LICENSE: LicenseConfig = {
  provider: cfg.license.provider as LicenseConfig['provider'],
  licenseServerUrl: cfg.license.licenseServerUrl,
  productIds: (cfg.license as { productIds?: string[] }).productIds,
  checkoutUrl: cfg.license.checkoutUrl,
};
export const DATA_BASE = cfg.dataBaseUrl.replace(/\/$/, '');
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = [
  'US: H-1B filings per year and the median salary offered',
  'Hide companies that don’t sponsor from search results',
  'Save companies to a shortlist and export it to CSV',
];
export const FREE_FEATURES = 'sponsor badges for the US, UK, Canada and the Netherlands on job pages and search results, and company search.';

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
export function activeCountries(s: Settings, _pro?: boolean): CC[] {
  return s.countries;
}

export const saved = {
  list: () => store.get<SavedCompany[]>('saved', []),
  add: (c: SavedCompany) => store.update<SavedCompany[]>('saved', [], (l) => [c, ...l.filter((x) => x.name !== c.name)]),
};
