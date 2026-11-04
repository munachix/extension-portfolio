/** Picking the right option in a dropdown / radio group. */
export const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();

/** Index of the option that best matches any of the preferred answers (in order), or -1. */
export function bestOption(options: string[], prefs: string[]): number {
  const opts = options.map(norm);
  const isPlaceholder = (o: string) => !o || /^(select|choose|please select|bitte w[aä]hlen|--)/.test(o);
  for (const raw of prefs) {
    const p = norm(raw);
    if (!p) continue;
    let i = opts.findIndex((o) => o === p);
    if (i >= 0) return i;
    // yes/no style answers: "Yes, I am authorized…" starts with "yes"
    if (p === 'yes' || p === 'no') {
      i = opts.findIndex((o) => !isPlaceholder(o) && (o === p || o.startsWith(`${p} `)));
      if (i >= 0) return i;
      continue;
    }
    i = opts.findIndex((o) => !isPlaceholder(o) && (o.startsWith(p) || p.startsWith(o)) && Math.min(o.length, p.length) >= 3);
    if (i >= 0) return i;
    i = opts.findIndex((o) => !isPlaceholder(o) && p.length >= 4 && o.includes(p));
    if (i >= 0) return i;
  }
  return -1;
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  'united states': ['United States of America', 'USA', 'US', 'U.S.'],
  'united kingdom': ['UK', 'Great Britain', 'United Kingdom of Great Britain and Northern Ireland'],
  netherlands: ['The Netherlands', 'Holland', 'Netherlands (the)'],
  germany: ['Deutschland'],
  'south korea': ['Korea, Republic of', 'Republic of Korea'],
};
export function countryPrefs(country: string): string[] {
  const k = norm(country);
  const hit = Object.entries(COUNTRY_ALIASES).find(([name, al]) => name === k || al.map(norm).includes(k));
  return hit ? [country, hit[0], ...hit[1]] : [country];
}

export const DECLINE_PREFS = ['Prefer not to say', 'I prefer not to say', 'Decline to self-identify', 'I don’t wish to answer', "I don't wish to answer", 'Prefer not to disclose', 'Decline to answer', 'I do not wish to self-identify', 'Decline', 'Not specified'];
