#!/usr/bin/env node
/**
 * pnpm scorecard                         table + tools/scorecard/dashboard.html
 * pnpm scorecard --sample                same, using made-up sample data (to preview)
 * pnpm scorecard add <slug> impressions=320 installs=41 weekly_users=150 uninstalls=6 hours_spent=1.5 [week=2026-11-02]
 * pnpm scorecard import-revenue          last-30-day revenue from Creem (or Lemon Squeezy / Polar) (.env keys)
 * pnpm scorecard import-cws <slug> <file.csv>   Chrome Web Store dashboard export
 * pnpm scorecard launch <slug> [2026-11-10]      record the day it went live (default: today)
 * pnpm scorecard rewrote <slug>                  count a listing rewrite (title/summary/screenshots)
 */
import { readFile, writeFile } from 'node:fs/promises';

import path from 'node:path';
import { DIR, paths, readJson, readMetrics, upsertRow, weekStart, writeMetrics } from './lib/data.mjs';
import { scorecard } from './lib/engine.mjs';
import { formatReport } from './lib/report.mjs';
import { renderDashboard } from './lib/dashboard.mjs';
import { importRevenue, loadEnv, parseCwsExport } from './lib/import.mjs';

const ROOT = path.resolve(DIR, '../..');
const [cmd, ...args] = process.argv.slice(2);

async function report({ sample = false } = {}) {
  const rules = await readJson(paths.rules);
  const projects = await readJson(paths.projects);
  const rows = await readMetrics(sample ? paths.sample : paths.metrics);
  // Sample data comes with its own launch dates so every rule shows up.
  const projs = sample ? (await readJson(path.join(DIR, 'data/sample-projects.json'))) : projects;
  const asOf = sample ? new Date('2026-11-02T12:00:00Z') : new Date();
  const card = scorecard(rows, projs, rules, asOf);
  console.log(formatReport(card, rules));
  await writeFile(paths.dashboard, renderDashboard(card, rules, { sample }));
  console.log(`\nDashboard: ${path.relative(ROOT, paths.dashboard)} (open it in your browser)`);
  if (!sample && !rows.length) console.log('No numbers yet. Add this week’s with: pnpm scorecard add <slug> impressions=… installs=…');
}

async function add() {
  const [slug, ...pairs] = args;
  if (!slug || !pairs.length) throw new Error('Usage: pnpm scorecard add <slug> impressions=320 installs=41 [week=2026-11-02]');
  const projects = await readJson(paths.projects);
  if (!projects.some((p) => p.slug === slug)) throw new Error(`Unknown slug "${slug}". Known: ${projects.map((p) => p.slug).join(', ')}`);
  let week = weekStart();
  const values = {};
  for (const p of pairs) {
    const [k, v] = p.split('=');
    if (k === 'week') { week = v; continue; }
    const n = Number(String(v).replace(/[$,]/g, ''));
    if (v == null || !Number.isFinite(n)) throw new Error(`"${p}" should look like installs=41`);
    values[k] = n;
  }
  const rows = await readMetrics();
  const row = upsertRow(rows, slug, week, values);
  await writeMetrics(rows);
  console.log(`✓ Saved ${slug} for week ${week}:`, Object.fromEntries(Object.entries(row).filter(([k, v]) => v != null && !['slug', 'week_start'].includes(k))));
}

async function revenue() {
  const env = await loadEnv(ROOT);
  const projects = await readJson(paths.projects);
  // Creem product ids come straight from each extension's config (the same ids the license check uses).
  for (const p of projects) {
    try {
      const cfg = JSON.parse(await readFile(path.join(ROOT, 'extensions', p.slug, 'extension.config.json'), 'utf8'));
      if (cfg.license?.provider === 'creem' && cfg.license.productIds?.length && !p.creemProductIds) p.creemProductIds = cfg.license.productIds;
    } catch { /* not an extension folder */ }
  }
  const results = await importRevenue(projects, env);
  if (!results.length) { console.log('No product ids yet: add your Creem product ids to extensions/<slug>/extension.config.json (license.productIds).'); return; }
  const rows = await readMetrics();
  const week = weekStart();
  for (const r of results) {
    upsertRow(rows, r.slug, week, { revenue_30d_usd: r.revenue, sales_30d: r.sales });
    console.log(`✓ ${r.slug}: $${r.revenue.toFixed(2)} from ${r.sales} sale(s) in the last 30 days (${r.provider})`);
  }
  await writeMetrics(rows);
}

async function cws() {
  const [slug, file] = args;
  if (!slug || !file) throw new Error('Usage: pnpm scorecard import-cws <slug> <export.csv>');
  const { columns, weeks } = parseCwsExport(await readFile(path.resolve(process.cwd(), file), 'utf8'));
  const rows = await readMetrics();
  for (const w of weeks) upsertRow(rows, slug, w.week, w.values);
  await writeMetrics(rows);
  console.log(`✓ Imported ${weeks.length} week(s) of ${columns.join(', ')} for ${slug}`);
}

async function updateProject(fn) {
  const [slug, value] = args;
  const projects = await readJson(paths.projects);
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`Unknown slug "${slug}". Known: ${projects.map((x) => x.slug).join(', ')}`);
  const msg = fn(p, value);
  await writeFile(paths.projects, JSON.stringify(projects, null, 2) + '\n');
  console.log(`✓ ${msg}`);
}
const launch = () => updateProject((p, date = new Date().toISOString().slice(0, 10)) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date should look like 2026-11-10');
  p.launchDate = date;
  return `${p.name} launched on ${date}`;
});
const rewrote = () => updateProject((p) => { p.listingRewrites = (p.listingRewrites ?? 0) + 1; return `${p.name}: listing rewrite #${p.listingRewrites} recorded`; });

const commands = { undefined: () => report(), '--sample': () => report({ sample: true }), add, 'import-revenue': revenue, 'import-cws': cws, launch, rewrote };
const run = commands[cmd];
if (!run) {
  console.error(`Unknown command "${cmd}". Try: pnpm scorecard | add | launch | rewrote | import-revenue | import-cws | --sample`);
  process.exit(1);
}
run().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
