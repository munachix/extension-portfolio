#!/usr/bin/env node
/**
 * Live smoke check for the job-page badges (VisaFlag, WorkFromWhere) on real pages.
 *   node tools/live-check/badges.mjs visaflag <job-url>… [--data <dir with sponsors-*.json.gz>]
 *   node tools/live-check/badges.mjs workfromwhere <job-url>… [--country NG]
 *
 * VisaFlag reads its data from --data (built with the pipeline) instead of the
 * not-yet-published data host. Prints what the badge says on each page.
 * Needs: pnpm build <slug>
 */
import { chromium } from '@playwright/test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const slug = args.shift();
const flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const dataDir = flag('--data');
const country = flag('--country') ?? 'NG';
const urls = args;
if (!['visaflag', 'workfromwhere'].includes(slug) || !urls.length) { console.error('Usage: node tools/live-check/badges.mjs <visaflag|workfromwhere> <url>… [--data dir] [--country CC]'); process.exit(1); }

const DIST = path.join(ROOT, 'extensions', slug, 'dist');
const cfg = JSON.parse(await readFile(path.join(ROOT, 'extensions', slug, 'extension.config.json'), 'utf8'));
const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'badge-live-')), {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});
if (slug === 'visaflag' && dataDir) {
  const base = cfg.dataBaseUrl.replace(/\/$/, '');
  await ctx.route(`${base}/**`, async (route) => {
    const file = path.join(dataDir, new URL(route.request().url()).pathname.split('/').pop());
    if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, body: await readFile(file), contentType: file.endsWith('.json') ? 'application/json' : 'application/gzip' });
  });
}
let [worker] = ctx.serviceWorkers();
if (!worker) worker = await ctx.waitForEvent('serviceworker');
for (const p of ctx.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();
if (slug === 'visaflag') {
  await worker.evaluate(() => chrome.storage.local.set({ settings: { countries: ['us', 'uk', 'ca', 'nl'], listBadges: true, hideNonSponsors: false } }));
  await worker.evaluate(() => chrome.runtime.onMessage.hasListeners()); // wake
  const opts = await ctx.newPage();
  await opts.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
  await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'vf:sync', force: true }));
  await opts.close();
} else {
  await worker.evaluate((c) => chrome.storage.local.set({ settings: { country: c, timeZone: 'Africa/Lagos', hideRed: false, listBadges: true, customRed: [], customGreen: [] } }), country);
}

const SEL = slug === 'visaflag' ? '[data-vf-badge]' : '[data-wfw-badge], [data-x-ext-ui]';
for (const url of urls) {
  const page = await ctx.newPage();
  console.log(`\n=== ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate((sel) => {
    const company = document.querySelector('.topcard__org-name-link, .job-details-jobs-unified-top-card__company-name, [data-testid="inlineHeader-companyName"]')?.textContent?.trim();
    const badges = [...document.querySelectorAll(sel)].map((b) => [...(b.shadowRoot ?? b).querySelectorAll('button, span, div')].map((n) => n.textContent?.trim()).filter(Boolean).slice(0, 4).join(' / '));
    return { title: document.title.slice(0, 90), company, badges };
  }, SEL);
  console.log(`  page: ${info.title}`);
  console.log(`  company on page: ${info.company ?? '(not found)'}`);
  console.log(info.badges.length ? info.badges.map((b) => `  badge: ${b.slice(0, 200)}`).join('\n') : '  ✗ no badge');
  await page.close();
}
await ctx.close();
