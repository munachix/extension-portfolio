/**
 * Company-name matching: "Google" on LinkedIn ↔ "Google (UK) Limited" on the UK register.
 *
 *  1. exact:  normalized names equal ("Acme Limited" = "ACME LTD")
 *  2. likely: equal after dropping country words ("Google (UK) Limited" → "google"),
 *             or Jaro-Winkler ≥ 0.93 (spec) among names sharing the first 3 letters.
 * A "likely" match is shown as such, with the official name, so the user can judge.
 */

const SUFFIXES = new Set([
  'ltd', 'limited', 'inc', 'incorporated', 'llc', 'plc', 'gmbh', 'bv', 'nv', 'sa', 'sas', 'sarl', 'srl', 'sl', 'ag', 'co', 'corp',
  'corporation', 'company', 'llp', 'lp', 'pty', 'pvt', 'private', 'pte', 'kg', 'ab', 'oy', 'spa', 'ulc', 'lc', 'pllc', 'pc', 'cic', 'ug',
]);
const GEO = new Set([
  'uk', 'gb', 'england', 'britain', 'us', 'usa', 'america', 'americas', 'na', 'canada', 'ca', 'europe', 'emea', 'international', 'intl', 'global',
  'nederland', 'netherlands', 'holland', 'nl', 'deutschland', 'germany', 'de', 'ireland', 'london', 'india', 'services', 'holdings',
]);

export function normalize(name: string): string {
  let s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  s = s.replace(/^the\s+/, '');
  let tokens = s.split(' ').filter(Boolean);
  // Join trailing single letters: "b v" -> "bv", "l l c" -> "llc"
  let j = tokens.length;
  while (j > 0 && tokens[j - 1].length === 1) j--;
  if (tokens.length - j >= 2) tokens = [...tokens.slice(0, j), tokens.slice(j).join('')];
  while (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  // also "and co" at the end
  if (tokens.length > 2 && tokens[tokens.length - 1] === 'co' && tokens[tokens.length - 2] === 'and') tokens = tokens.slice(0, -2);
  return tokens.join(' ');
}

/** The name without country/region words, e.g. "google uk" -> "google". Null if nothing meaningful is left. */
export function coreKey(key: string): string | null {
  const t = key.split(' ').filter((w) => !GEO.has(w));
  while (t.length > 1 && SUFFIXES.has(t[t.length - 1])) t.pop();
  const c = t.join(' ');
  return c && c !== key && c.replace(/ /g, '').length >= 3 ? c : null;
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const range = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const ma = new Array<boolean>(la).fill(false);
  const mb = new Array<boolean>(lb).fill(false);
  let m = 0;
  for (let i = 0; i < la; i++) {
    for (let k = Math.max(0, i - range); k < Math.min(lb, i + range + 1); k++) {
      if (!mb[k] && a[i] === b[k]) { ma[i] = mb[k] = true; m++; break; }
    }
  }
  if (!m) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < la; i++) {
    if (!ma[i]) continue;
    while (!mb[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (m / la + m / lb + (m - t / 2) / m) / 3;
  let p = 0;
  while (p < 4 && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

export interface Match { kind: 'exact' | 'likely'; rows: number[]; score: number }

export class Matcher {
  private exact = new Map<string, number[]>();
  /** Trading names ("… T/A Deliveroo") rank below registered names. */
  private trading = new Map<string, number[]>();
  private core = new Map<string, number[]>();
  private buckets = new Map<string, { key: string; i: number }[]>();
  readonly size: number;

  constructor(names: string[], private threshold = 0.93) {
    this.size = names.length;
    const add = (map: Map<string, number[]>, k: string, i: number) => { const l = map.get(k); if (l) { if (!l.includes(i)) l.push(i); } else map.set(k, [i]); };
    names.forEach((full, i) => {
      // UK register: "Acme Ltd T/A Acme Coffee" -> index both names
      full.split(/\s+(?:t\/a|trading as|t\/as|dba|d\/b\/a)\s+/i).forEach((part, n) => {
        const k = normalize(part);
        if (!k) return;
        add(n === 0 ? this.exact : this.trading, k, i);
        const c = coreKey(k);
        if (c && n === 0) add(this.core, c, i);
        if (k.length >= 5) {
          const b = k.slice(0, 3);
          const l = this.buckets.get(b) ?? [];
          l.push({ key: k, i });
          this.buckets.set(b, l);
        }
      });
    });
  }

  lookup(name: string): Match | null {
    const k = normalize(name);
    if (!k) return null;
    const ex = this.exact.get(k);
    if (ex) return { kind: 'exact', rows: ex, score: 1 };
    const c = coreKey(k) ?? k;
    const likely = this.core.get(c) ?? this.core.get(k) ?? this.exact.get(c);
    if (likely) return { kind: 'likely', rows: likely, score: 0.97 };
    const tr = this.trading.get(k);
    if (tr) return { kind: 'exact', rows: tr, score: 1 };
    if (k.length < 5) return null;
    const bucket = this.buckets.get(k.slice(0, 3)) ?? [];
    // "Barclays" -> "Barclays Bank PLC": registered name starts with the brand; shortest wins.
    let prefix: { i: number; len: number } | null = null;
    for (const cand of bucket) {
      if (cand.key.startsWith(`${k} `) && (!prefix || cand.key.length < prefix.len)) prefix = { i: cand.i, len: cand.key.length };
    }
    if (prefix) return { kind: 'likely', rows: [prefix.i], score: 0.95 };
    // Spacing differs: "JPMorganChase" (LinkedIn) -> "JPMorgan Chase Bank, National Association".
    const compact = k.replace(/ /g, '');
    for (const cand of bucket) {
      const words = cand.key.split(' ');
      let joined = '';
      for (const w of words) {
        joined += w;
        if (joined.length >= compact.length) break;
      }
      if (joined === compact && cand.key !== k && (!prefix || cand.key.length < prefix.len)) prefix = { i: cand.i, len: cand.key.length };
    }
    if (prefix) return { kind: 'likely', rows: [prefix.i], score: 0.94 };
    let best: { i: number; s: number } | null = null;
    for (const cand of bucket) {
      if (Math.abs(cand.key.length - k.length) > 6) continue;
      const s = jaroWinkler(k, cand.key);
      if (s >= this.threshold && (!best || s > best.s)) best = { i: cand.i, s };
    }
    return best ? { kind: 'likely', rows: [best.i], score: best.s } : null;
  }
}
