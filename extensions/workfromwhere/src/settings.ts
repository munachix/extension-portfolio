import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import { COUNTRY_CODES } from './engine/places';

export interface Settings {
  country: string | null;
  timeZone: string | null;
  /** Pro: hide restricted jobs in search results */
  hideRed: boolean;
  /** Pro: badges on search-result lists */
  listBadges: boolean;
  /** Pro: custom phrases */
  customRed: string[];
  customGreen: string[];
}

export interface SavedJob {
  url: string;
  title: string;
  company: string;
  status: string;
  reason: string;
  savedAt: string;
}

export const LICENSE: LicenseConfig = {
  provider: cfg.license.provider as LicenseConfig['provider'],
  productId: cfg.license.productId ?? undefined,
  checkoutUrl: cfg.license.checkoutUrl,
};
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = [
  'Badges on search-result lists, and hide jobs you can’t take',
  'See required hours in your own time zone',
  'Save open jobs and export them to CSV',
  'Your own phrase rules',
];

/** Best guess from the browser language, e.g. "en-NG" -> "NG". The user confirms in settings. */
export function guessCountry(): string | null {
  for (const l of navigator.languages ?? [navigator.language]) {
    const region = l.split('-')[1]?.toUpperCase();
    if (region && COUNTRY_CODES.includes(region)) return region;
  }
  return null;
}

const KEY = 'settings';

export function defaults(): Settings {
  return {
    country: guessCountry(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    hideRed: false,
    listBadges: true,
    customRed: [],
    customGreen: [],
  };
}

export async function loadSettings(): Promise<Settings> {
  return { ...defaults(), ...(await store.get<Partial<Settings>>(KEY, {})) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await store.set(KEY, next);
  return next;
}

export function onStorageChanged(fn: () => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[KEY] || changes.license)) fn();
  });
}

export const savedJobs = {
  list: () => store.get<SavedJob[]>('savedJobs', []),
  async add(job: SavedJob) {
    await store.update<SavedJob[]>('savedJobs', [], (l) => [job, ...l.filter((j) => j.url !== job.url)]);
  },
  async remove(url: string) {
    await store.update<SavedJob[]>('savedJobs', [], (l) => l.filter((j) => j.url !== url));
  },
};
