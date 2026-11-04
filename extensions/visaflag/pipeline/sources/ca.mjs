/** Canada: TFWP positive LMIA employers (open.canada.ca, quarterly Excel files). Last 4 quarters combined. */
import { download, forEachXlsxRow, getText, headerIndex } from './common.mjs';

export const PACKAGE = 'https://open.canada.ca/data/api/action/package_show?id=90fed587-1364-4f33-a9ee-208181dc0b97';
const QUARTERS = 4;

/** Pick the newest English quarterly files: tfwp_2026q2_pos_en.xlsx etc. */
export function pickResources(pkg) {
  const found = [];
  for (const r of pkg.result?.resources ?? []) {
    const m = String(r.url ?? '').match(/tfwp_(\d{4})q([1-4])_pos_en\.(xlsx|csv)$/i);
    if (m) found.push({ url: r.url, year: Number(m[1]), q: Number(m[2]), period: `${m[1]}Q${m[2]}`, format: m[3].toLowerCase() });
  }
  found.sort((a, b) => b.year - a.year || b.q - a.q);
  return found.slice(0, QUARTERS);
}

/** Aggregate one quarter's rows (arrays of strings) into the running map. */
export function addQuarter(map, rows, period) {
  let idx = null;
  let n = 0;
  for (const row of rows) {
    if (!idx) {
      const h = headerIndex(row, { employer: ['Employer'], province: ['Province/Territory', 'Province'], positions: ['Approved Positions', 'Approved positions'], lmias: ['Approved LMIAs', 'Approved lmias'] });
      if (h.employer != null) idx = h;
      continue;
    }
    const name = (row[idx.employer] ?? '').replace(/\s+/g, ' ').trim();
    if (!name || /^notes?\b/i.test(name)) continue;
    const e = map.get(name) ?? { positions: 0, last: '', provinces: new Set() };
    e.positions += Number(String(row[idx.positions] ?? '').replace(/[^\d.]/g, '')) || 0;
    if (period > e.last) e.last = period;
    if (row[idx.province]) e.provinces.add(row[idx.province]);
    map.set(name, e);
    n++;
  }
  if (!idx) throw new Error(`CA ${period}: header row with "Employer" not found`);
  return n;
}

export function finish(map) {
  return { fields: ['name', 'positions', 'lastQuarter', 'provinces'], rows: [...map].map(([name, e]) => [name, e.positions, e.last, [...e.provinces].join('|')]) };
}

export async function fetchCA({ fetch: f = fetch } = {}) {
  const res = pickResources(JSON.parse(await getText(PACKAGE, f)));
  if (!res.length) throw new Error('CA: no quarterly positive-LMIA files found');
  const map = new Map();
  for (const r of res) {
    if (r.format !== 'xlsx') throw new Error(`CA ${r.period}: expected an Excel file, got ${r.format}`);
    const { file, cleanup } = await download(r.url, f);
    try { const rows = []; await forEachXlsxRow(file, (row) => rows.push(row)); addQuarter(map, rows, r.period); } finally { await cleanup(); }
  }
  return { ...finish(map), updated: res[0].period, source: res.map((r) => r.url).join(' '), meta: { quarters: res.map((r) => r.period) }, minRows: 5000 };
}

