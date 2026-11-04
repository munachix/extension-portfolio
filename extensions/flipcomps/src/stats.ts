/** Sold-price summary with outliers (lots, parts, typos) removed. */
export interface Stats { count: number; used: number; median: number; p25: number; p75: number; low: number; high: number; mean: number }

const q = (s: number[], p: number) => { const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

export function summarize(prices: number[]): Stats | null {
  const all = prices.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!all.length) return null;
  let used = all;
  if (all.length >= 8) {
    const a = q(all, 0.25), b = q(all, 0.75), iqr = b - a;
    used = all.filter((x) => x >= a - 1.5 * iqr && x <= b + 1.5 * iqr);
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { count: all.length, used: used.length, median: r(q(used, 0.5)), p25: r(q(used, 0.25)), p75: r(q(used, 0.75)), low: used[0], high: used[used.length - 1], mean: r(used.reduce((s, x) => s + x, 0) / used.length) };
}

/** "$1,234.56" -> 1234.56; ranges like "$20.00 to $35.00" -> midpoint. */
export function parsePrice(text: string): number | null {
  const m = [...text.replace(/\s+/g, ' ').matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g)].map((x) => Number(x[1].replace(/,/g, '')));
  if (!m.length) return null;
  return m.length >= 2 && /\bto\b|–|-/.test(text) ? (m[0] + m[1]) / 2 : m[0];
}
