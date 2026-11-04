/** Reading/writing the scorecard's data files. */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, stringifyCsv } from './csv.mjs';

export const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COLUMNS = ['week_start', 'slug', 'impressions', 'installs', 'weekly_users', 'uninstalls', 'revenue_30d_usd', 'sales_30d', 'rating', 'rating_count', 'hours_spent'];
const NUMERIC = COLUMNS.slice(2);

export const paths = {
  metrics: path.join(DIR, 'data/metrics.csv'),
  sample: path.join(DIR, 'data/sample-metrics.csv'),
  projects: path.join(DIR, 'data/projects.json'),
  rules: path.join(DIR, 'rules.json'),
  dashboard: path.join(DIR, 'dashboard.html'),
};

/** Parse metric rows; blank numeric cells become null (unknown), not 0. */
export function normalizeRows(raw) {
  return raw.map((r, i) => {
    const out = { week_start: r.week_start, slug: r.slug };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.week_start ?? '')) throw new Error(`metrics.csv row ${i + 2}: week_start must look like 2026-11-02 (got "${r.week_start}")`);
    if (!out.slug) throw new Error(`metrics.csv row ${i + 2}: slug is empty`);
    for (const c of NUMERIC) {
      const v = (r[c] ?? '').replace(/[$,\s]/g, '');
      if (v === '') { out[c] = null; continue; }
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`metrics.csv row ${i + 2}: ${c} "${r[c]}" is not a number`);
      out[c] = n;
    }
    return out;
  });
}

export async function readMetrics(file = paths.metrics) {
  if (!existsSync(file)) return [];
  return normalizeRows(parseCsv(await readFile(file, 'utf8')));
}

export async function writeMetrics(rows, file = paths.metrics) {
  const sorted = [...rows].sort((a, b) => a.week_start.localeCompare(b.week_start) || a.slug.localeCompare(b.slug));
  await writeFile(file, stringifyCsv(sorted, COLUMNS));
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/** Monday of the week containing `date` (UTC), as YYYY-MM-DD. */
export function weekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Insert or merge one week's numbers for one extension. Only given fields change. */
export function upsertRow(rows, slug, week, values) {
  let row = rows.find((r) => r.slug === slug && r.week_start === week);
  if (!row) {
    row = { week_start: week, slug, ...Object.fromEntries(NUMERIC.map((c) => [c, null])) };
    rows.push(row);
  }
  for (const [k, v] of Object.entries(values)) {
    if (!NUMERIC.includes(k)) throw new Error(`Unknown column "${k}". Use one of: ${NUMERIC.join(', ')}`);
    row[k] = v;
  }
  return row;
}
