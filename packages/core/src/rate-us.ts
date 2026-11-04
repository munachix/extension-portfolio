/**
 * "Rate us" prompt: becomes due after the 3rd successful use, is shown once,
 * and never gates any feature.
 */
import { store } from './storage';

const KEY = 'rateUs';
export const RATE_AFTER = 3;

interface RateState {
  uses: number;
  shown: boolean;
  /** de-dupe ids so the same job page doesn't count twice */
  seen: string[];
}

const empty: RateState = { uses: 0, shown: false, seen: [] };

/** Record a successful use. Pass an id (e.g. the page URL) to count each thing once. */
export async function recordSuccess(id?: string): Promise<number> {
  const s = await store.update<RateState>(KEY, empty, (s) => {
    if (id && s.seen.includes(id)) return s;
    const seen = id ? [...s.seen, id].slice(-50) : s.seen;
    return { ...s, uses: s.uses + 1, seen };
  });
  return s.uses;
}

export async function shouldShowRateUs(): Promise<boolean> {
  const s = await store.get<RateState>(KEY, empty);
  return !s.shown && s.uses >= RATE_AFTER;
}

export async function markRateUsShown(): Promise<void> {
  await store.update<RateState>(KEY, empty, (s) => ({ ...s, shown: true }));
}

export function storeListingUrl(extensionId: string): string {
  return `https://chromewebstore.google.com/detail/${extensionId}/reviews`;
}
