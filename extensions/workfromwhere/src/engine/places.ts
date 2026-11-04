/** Country/region dictionary: finds place names in text and answers "is country X inside region Y?". */
import data from './regions.json';

export type Code = string;

export interface Mention {
  start: number;
  end: number;
  code: Code;
  alias: string;
}

const countries = data.countries as Record<string, string[]>;
const regions = data.regions as Record<string, { name: string; aliases: string[]; members: string[] }>;
const noMatch = new Set((data.noMatch as string[]).map((s) => s.toLowerCase()));

export const COUNTRY_CODES = Object.keys(countries);

export function countryName(code: Code): string {
  return countries[code]?.[0] ?? code;
}

export function displayName(code: Code): string {
  return regions[code]?.name ?? countryName(code);
}

export function isRegion(code: Code): boolean {
  return code in regions;
}

/** Countries for a picker, sorted by name. */
export function countryOptions(): { code: Code; name: string }[] {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
}

const expanded = new Map<Code, Set<Code>>();
export function expand(code: Code, seen = new Set<Code>()): Set<Code> {
  const hit = expanded.get(code);
  if (hit) return hit;
  const out = new Set<Code>();
  if (!regions[code]) out.add(code);
  else if (!seen.has(code)) {
    seen.add(code);
    for (const m of regions[code].members) expand(m, seen).forEach((c) => out.add(c));
  }
  expanded.set(code, out);
  return out;
}

/** Does `code` (a country or region) include the user's country? */
export function includesCountry(code: Code, user: Code): boolean {
  return code === user || expand(code).has(user);
}

/** Number of countries a code covers (used to prefer the most specific match). */
export const sizeOf = (code: Code) => expand(code).size;

// ---------- matcher ----------
interface Entry { alias: string; code: Code; caseSensitive: boolean }

const entries: Entry[] = [];
const isCaps = (s: string) => /^[A-Z][A-Z.&/]*$/.test(s);
for (const [code, names] of Object.entries(countries)) {
  for (const alias of names) if (!noMatch.has(alias.toLowerCase())) entries.push({ alias, code, caseSensitive: isCaps(alias) });
}
for (const [code, r] of Object.entries(regions)) {
  for (const alias of r.aliases) entries.push({ alias, code, caseSensitive: isCaps(alias) });
}
entries.sort((a, b) => b.alias.length - a.alias.length);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const ciMap = new Map(entries.filter((e) => !e.caseSensitive).map((e) => [e.alias.toLowerCase(), e.code]));
const csMap = new Map(entries.filter((e) => e.caseSensitive).map((e) => [e.alias, e.code]));
const ciRe = new RegExp(`${B}(?:${entries.filter((e) => !e.caseSensitive).map((e) => esc(e.alias)).join('|')})${E}`, 'giu');
const csRe = new RegExp(`${B}(?:${entries.filter((e) => e.caseSensitive).map((e) => esc(e.alias)).join('|')})${E}`, 'gu');

/** All place-name mentions in `text`, non-overlapping, longest match wins. */
export function findMentions(text: string): Mention[] {
  const found: Mention[] = [];
  for (const m of text.matchAll(ciRe)) {
    const code = ciMap.get(m[0].replace(/\s+/g, ' ').toLowerCase());
    if (code) found.push({ start: m.index!, end: m.index! + m[0].length, code, alias: m[0] });
  }
  for (const m of text.matchAll(csRe)) {
    const code = csMap.get(m[0].replace(/\s+/g, ' '));
    if (code) found.push({ start: m.index!, end: m.index! + m[0].length, code, alias: m[0] });
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out: Mention[] = [];
  for (const m of found) {
    const last = out[out.length - 1];
    if (last && m.start < last.end) continue;
    out.push(m);
  }
  return out;
}
