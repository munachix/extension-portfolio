/**
 * US: DOL OFLC LCA disclosure data (H-1B), quarterly Excel files, cumulative per fiscal year.
 * Uses the latest fiscal-year file plus the previous full year. Per employer:
 * certified H-1B LCAs in each year and the median offered wage (annualised).
 */
import { readFile } from 'node:fs/promises';
import { UA, download, forEachXlsxRow, getText, headerIndex, median } from './common.mjs';

export const PAGE = 'https://www.dol.gov/agencies/eta/foreign-labor/performance';
const PER_YEAR = { year: 1, month: 12, 'bi-weekly': 26, biweekly: 26, week: 52, hour: 2080 };

export function pickFiles(html, base = 'https://www.dol.gov') {
  const files = new Map();
  for (const m of html.matchAll(/href="([^"]*LCA_Disclosure_Data_FY(\d{4})_Q([1-4])\.xlsx)"/gi)) {
    const u = new URL(m[1], base);
    u.pathname = u.pathname.replace(/\/{2,}/g, '/');
    const url = u.href;
    const fy = Number(m[2]), q = Number(m[3]);
    const prev = files.get(fy);
    if (!prev || q > prev.q) files.set(fy, { url, fy, q });
  }
  const years = [...files.values()].sort((a, b) => b.fy - a.fy);
  if (!years.length) throw new Error('US: no LCA_Disclosure_Data files linked on the DOL page');
  return { current: years[0], previous: years[1] ?? null };
}

export function annualWage(value, unit) {
  const n = Number(String(value ?? '').replace(/[$,\s]/g, ''));
  const k = PER_YEAR[String(unit ?? '').toLowerCase().trim()];
  if (!n || !k) return null;
  const w = n * k;
  return w >= 15000 && w <= 2000000 ? Math.round(w) : null; // drop obvious data-entry errors
}

/** Returns a function that takes one row (array of strings) of an LCA file at a time. slot: 'prev' | 'curr'. */
export function yearAggregator(map, slot) {
  let idx = null;
  return (row) => {
    if (!idx) {
      idx = headerIndex(row, { status: ['CASE_STATUS'], visa: ['VISA_CLASS'], employer: ['EMPLOYER_NAME'], state: ['EMPLOYER_STATE'], wage: ['WAGE_RATE_OF_PAY_FROM'], unit: ['WAGE_UNIT_OF_PAY'] });
      for (const k of ['status', 'visa', 'employer', 'wage', 'unit']) if (idx[k] == null) throw new Error(`US: column ${k} not found in LCA file header`);
      return;
    }
    if (!/^certified$/i.test(row[idx.status] ?? '') || !/^h-?1b$/i.test(row[idx.visa] ?? '')) return;
    const name = (row[idx.employer] ?? '').replace(/\s+/g, ' ').trim();
    if (!name) return;
    const e = map.get(name) ?? { prev: 0, curr: 0, wages: [], state: '' };
    e[slot] += 1;
    const w = annualWage(row[idx.wage], row[idx.unit]);
    if (w) e.wages.push(w);
    if (!e.state && idx.state != null) e.state = row[idx.state] ?? '';
    map.set(name, e);
  };
}

export function addYear(map, rows, slot) {
  const push = yearAggregator(map, slot);
  for (const r of rows) push(r);
}

export function finish(map) {
  return { fields: ['name', 'filingsPrevYear', 'filingsThisYear', 'medianWage', 'state'], rows: [...map].map(([name, e]) => [name, e.prev, e.curr, median(e.wages), e.state]) };
}

const PATTERNS = [
  (fy, q) => `https://www.dol.gov/media/LCA_Disclosure_Data_FY${fy}_Q${q}.xlsx`,
  (fy, q) => `https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY${fy}_Q${q}.xlsx`,
];
const nextQuarter = ({ fy, q }) => (q === 4 ? { fy: fy + 1, q: 1 } : { fy, q: q + 1 });

/** Known files from us-files.json, upgraded if DOL has posted a newer quarter at its usual address. */
export async function knownFiles(f = fetch, known) {
  known ??= JSON.parse(await readFile(new URL('./us-files.json', import.meta.url), 'utf8'));
  let { current, previous } = known;
  for (let i = 0; i < 2; i++) {
    const n = nextQuarter(current);
    let found = null;
    for (const p of PATTERNS) {
      const url = p(n.fy, n.q);
      const res = await f(url, { method: 'HEAD', headers: { 'User-Agent': UA } }).catch(() => null);
      if (res?.ok) { found = { ...n, url }; break; }
    }
    if (!found) break;
    if (found.fy > current.fy) previous = current;
    current = found;
  }
  return { current, previous };
}

/** "…LCA_Disclosure_Data_FY2026_Q3.xlsx" -> { fy: 2026, q: 3 } */
export function fyOf(name) {
  const m = String(name).match(/FY_?(\d{4})_Q([1-4])/i);
  if (!m) throw new Error(`Can't tell the fiscal year/quarter from "${name}". Keep DOL's file name (LCA_Disclosure_Data_FY2026_Q3.xlsx).`);
  return { fy: Number(m[1]), q: Number(m[2]) };
}

/**
 * Local files (downloaded in a browser): DOL refuses automated downloads.
 * Pass 1–2 paths; the newest fiscal year is "this year", the other "previous year".
 */
export async function buildUSFromFiles(paths) {
  const files = paths.map((p) => ({ ...fyOf(p), path: p })).sort((a, b) => b.fy - a.fy || b.q - a.q);
  const [current, previous] = files;
  const map = new Map();
  await forEachXlsxRow(current.path, yearAggregator(map, 'curr'));
  if (previous) await forEachXlsxRow(previous.path, yearAggregator(map, 'prev'));
  return {
    ...finish(map),
    updated: `FY${current.fy} Q${current.q}`,
    source: 'https://www.dol.gov/agencies/eta/foreign-labor/performance',
    meta: { thisYear: `FY${current.fy} (through Q${current.q})`, prevYear: previous ? `FY${previous.fy}` : null },
    minRows: 20000,
  };
}

export async function fetchUS({ fetch: f = fetch } = {}) {
  if (process.env.US_LCA_FILES) return buildUSFromFiles(process.env.US_LCA_FILES.split(',').map((s) => s.trim()).filter(Boolean));
  let files;
  try {
    files = pickFiles(await getText(PAGE, f));
  } catch {
    files = await knownFiles(f);
  }
  const { current, previous } = files;
  const map = new Map();
  for (const [file, slot] of [[current, 'curr'], [previous, 'prev']]) {
    if (!file) continue;
    const dl = await download(file.url, f);
    try { await forEachXlsxRow(dl.file, yearAggregator(map, slot)); } finally { await dl.cleanup(); }
  }
  return {
    ...finish(map),
    updated: `FY${current.fy} Q${current.q}`,
    source: [current.url, previous?.url].filter(Boolean).join(' '),
    meta: { thisYear: `FY${current.fy} (through Q${current.q})`, prevYear: previous ? `FY${previous.fy}` : null },
    minRows: 20000,
  };
}
