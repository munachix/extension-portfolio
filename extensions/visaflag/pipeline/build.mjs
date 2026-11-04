#!/usr/bin/env node
/**
 * Builds the VisaFlag sponsor data files.
 *
 *   node extensions/visaflag/pipeline/build.mjs [uk nl ca us] [--out dir] [--strict]
 *
 * Output (what the GitHub Action publishes to GitHub Pages):
 *   sponsors-<cc>.json.gz   { country, updated, source, fields, meta, rows }
 *   index.json              { version, generated, countries: { cc: { updated, count, file, bytes, stale? } } }
 *   report.json             { ok, failures: [{ country, error }] }
 *
 * If a source fails (site down, format changed), the previously published file is
 * reused (from PREVIOUS_BASE_URL) and marked stale, so the extension keeps the
 * last good data. The failure is still reported; the Action turns it into a red run.
 */
import { gunzipSync, gzipSync } from 'node:zlib';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchUK } from './sources/uk.mjs';
import { fetchNL } from './sources/nl.mjs';
import { fetchCA } from './sources/ca.mjs';
import { buildUSFromFiles, fetchUS } from './sources/us.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SOURCES = { uk: fetchUK, nl: fetchNL, ca: fetchCA, us: fetchUS };
export const NAMES = { uk: 'United Kingdom', us: 'United States (H-1B)', ca: 'Canada (LMIA)', nl: 'Netherlands' };

/** Committed snapshots: used when a source can't be downloaded automatically (the US). */
export const SNAPSHOT_DIR = path.join(HERE, 'data');

export async function buildAll({ countries = Object.keys(SOURCES), out = path.join(HERE, 'out'), previousBase = process.env.PREVIOUS_BASE_URL, fetch: f = fetch, log = console.log, snapshots = SNAPSHOT_DIR } = {}) {
  await mkdir(out, { recursive: true });
  let prevIndex = null;
  if (previousBase) {
    try { prevIndex = await (await f(`${previousBase.replace(/\/$/, '')}/index.json`)).json(); } catch { /* first run */ }
  }
  const index = { version: 1, generated: new Date().toISOString(), countries: {} };
  const failures = [];
  for (const cc of countries) {
    const file = `sponsors-${cc}.json.gz`;
    try {
      const started = Date.now();
      const data = await SOURCES[cc]({ fetch: f });
      if (data.rows.length < data.minRows) throw new Error(`only ${data.rows.length} rows (expected at least ${data.minRows}); the source format may have changed`);
      const { minRows, ...rest } = data;
      const gz = gzipSync(JSON.stringify({ country: cc, ...rest }), { level: 9 });
      await writeFile(path.join(out, file), gz);
      index.countries[cc] = { name: NAMES[cc], updated: data.updated, count: data.rows.length, file, bytes: gz.length };
      log(`✓ ${cc}: ${data.rows.length.toLocaleString()} employers, ${(gz.length / 1048576).toFixed(1)} MB, updated ${data.updated} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    } catch (e) {
      const snap = path.join(snapshots, file);
      if (existsSync(snap)) {
        const data = JSON.parse(gunzipSync(await readFile(snap)).toString());
        await copyFile(snap, path.join(out, file));
        index.countries[cc] = { name: NAMES[cc], updated: data.updated, count: data.rows.length, file, bytes: (await readFile(snap)).length, snapshot: true };
        log(`↺ ${cc}: download refused (${e.message}); published the committed snapshot from ${data.updated}`);
        continue;
      }
      failures.push({ country: cc, error: e.message });
      log(`✗ ${cc}: ${e.message}`);
      const prev = prevIndex?.countries?.[cc];
      if (prev && previousBase) {
        try {
          const buf = Buffer.from(await (await f(`${previousBase.replace(/\/$/, '')}/${prev.file}`)).arrayBuffer());
          await writeFile(path.join(out, file), buf);
          index.countries[cc] = { ...prev, stale: true };
          log(`  ↺ kept last good ${cc} data from ${prev.updated}`);
        } catch { log(`  ✗ couldn't fetch the previous ${cc} file either`); }
      }
    }
  }
  await writeFile(path.join(out, 'index.json'), JSON.stringify(index, null, 2));
  await writeFile(path.join(out, 'report.json'), JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
  return { index, failures };
}

/** pnpm visaflag:us <file.xlsx> [<file.xlsx>]: build the US snapshot from files downloaded in a browser. */
export async function buildUSSnapshot(paths, dir = SNAPSHOT_DIR, log = console.log) {
  const data = await buildUSFromFiles(paths);
  if (data.rows.length < data.minRows) throw new Error(`only ${data.rows.length} employers; is this the right file?`);
  const { minRows, ...rest } = data;
  await mkdir(dir, { recursive: true });
  const gz = gzipSync(JSON.stringify({ country: 'us', ...rest }), { level: 9 });
  await writeFile(path.join(dir, 'sponsors-us.json.gz'), gz);
  log(`✓ US snapshot: ${data.rows.length.toLocaleString()} employers, ${data.meta.thisYear}${data.meta.prevYear ? ` + ${data.meta.prevYear}` : ''}, ${(gz.length / 1048576).toFixed(1)} MB → ${path.relative(process.cwd(), path.join(dir, 'sponsors-us.json.gz'))}`);
  log('  Commit this file; the weekly Action publishes it.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === 'us-snapshot') {
    await buildUSSnapshot(args.slice(1));
    process.exit(0);
  }
  const outAt = args.indexOf('--out');
  const out = outAt >= 0 ? path.resolve(args[outAt + 1]) : undefined;
  const countries = args.filter((a, i) => SOURCES[a] && args[i - 1] !== '--out');
  const { failures } = await buildAll({ countries: countries.length ? countries : undefined, out });
  if (args.includes('--strict') && failures.length) process.exit(1);
}
