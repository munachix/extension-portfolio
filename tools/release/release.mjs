#!/usr/bin/env node
/**
 * pnpm release <slug>
 *  1. Store build (minified, test key disabled) -> extensions/<slug>/dist-prod
 *  2. Writes extensions/<slug>/store/listing.md from the spec + store/description.md
 *  3. Fails if Chrome Web Store limits are exceeded (name 75, summary 132, description 16,000)
 *  4. Zips the build -> dist/<slug>-<version>.zip, ready to upload
 */
import { zipSync } from 'fflate';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, buildExtension } from './build.mjs';

export const LIMITS = { name: 75, summary: 132, description: 16000 };

/** Pull "**Name:** …", "**Summary:** …", etc. out of a spec's "Store listing" section. */
export function parseSpecListing(md) {
  const field = (label) => md.match(new RegExp(`\\*\\*${label}[^*]*:\\*\\*\\s*(.+)`))?.[1]?.trim() ?? '';
  return { name: field('Name'), summary: field('Summary'), category: field('Category'), keywords: field('SEO keywords') };
}

export function checkLimits(l) {
  const errors = [];
  for (const k of Object.keys(LIMITS)) {
    const len = [...(l[k] ?? '')].length;
    if (!len) errors.push(`${k} is empty`);
    else if (len > LIMITS[k]) errors.push(`${k} is ${len} characters (limit ${LIMITS[k]})`);
  }
  return errors;
}

async function files(dir, base = dir) {
  const out = {};
  for (const name of await readdir(dir)) {
    if (name.startsWith('._') || name === '.DS_Store') continue;
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) Object.assign(out, await files(p, base));
    else out[path.relative(base, p).split(path.sep).join('/')] = new Uint8Array(await readFile(p));
  }
  return out;
}

/** Things that make a store build unsellable (placeholders, no product ids). */
export function launchProblems(config, dir = null) {
  const out = [];
  for (const f of config.launchFiles ?? []) {
    if (dir && !existsSync(path.join(dir, f.path))) out.push(`${f.path} is missing: ${f.why}`);
  }
  const json = JSON.stringify(config);
  if (/REPLACE-ME/.test(json)) out.push('extension.config.json still has REPLACE-ME placeholders (license server, checkout or data URL)');
  const lic = config.license ?? {};
  const ids = [...(lic.productIds ?? []), ...(lic.productId != null ? [lic.productId] : [])].filter(Boolean);
  if (lic.provider === 'creem' && !ids.length) out.push('license.productIds is empty: any key from your store would unlock this extension');
  return out;
}

export async function release(slug, { draft = false } = {}) {
  const { outDir, manifest, version, config, dir } = await buildExtension(slug, { prod: true });
  const notReady = launchProblems(config, dir);
  if (notReady.length && !draft) throw new Error(`Not ready for the store:\n  - ${notReady.join('\n  - ')}\n  (use "pnpm release ${slug} --draft" for a test zip)`);
  if (notReady.length) console.warn(`⚠ Draft zip, not for upload:\n  - ${notReady.join('\n  - ')}`);
  const spec = parseSpecListing(await readFile(path.join(ROOT, config.spec), 'utf8'));
  const descFile = path.join(dir, 'store/description.md');
  const description = existsSync(descFile) ? (await readFile(descFile, 'utf8')).trim() : '';
  const listing = { name: manifest.name, summary: manifest.description, description, category: spec.category, keywords: spec.keywords };

  const errors = checkLimits(listing);
  if (spec.name && spec.name !== manifest.name) errors.push(`manifest name "${manifest.name}" differs from the spec name "${spec.name}"`);
  if (errors.length) throw new Error(`Store listing problems:\n  - ${errors.join('\n  - ')}`);

  await writeFile(path.join(dir, 'store/listing.md'), `# Chrome Web Store listing: ${manifest.short_name} ${version}

Copy each field into the Developer Dashboard → Store listing.

## Name (${[...listing.name].length}/${LIMITS.name})
${listing.name}

## Summary (${[...listing.summary].length}/${LIMITS.summary})
${listing.summary}

## Category
${listing.category}

## Description (${[...listing.description].length}/${LIMITS.description})
${listing.description}

## Search keywords (use naturally in the description; the store has no keyword field)
${listing.keywords}

## Graphics
- Icon: public/icons/128.png
- Promo tile: store/promo-440x280.png
- Screenshots: store/screenshots/*.png
`);

  await mkdir(path.join(ROOT, 'dist'), { recursive: true });
  const zipPath = path.join(ROOT, "dist", `${slug}-${version}${draft ? "-DRAFT-not-for-upload" : ""}.zip`);
  const entries = await files(outDir);
  await writeFile(zipPath, zipSync(entries, { level: 9 }));
  const kb = ((await stat(zipPath)).size / 1024).toFixed(0);
  console.log(`✓ ${path.relative(ROOT, zipPath)} (${Object.keys(entries).length} files, ${kb} KB)`);
  console.log(`✓ ${path.relative(ROOT, path.join(dir, 'store/listing.md'))}`);
  return zipPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: pnpm release <slug>'); process.exit(1); }
  release(slug, { draft: process.argv.includes('--draft') }).catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
}
