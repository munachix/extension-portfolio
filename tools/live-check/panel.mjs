#!/usr/bin/env node
/**
 * Live smoke check for extensions that show an on-page panel (FlipComps, ReconFinder).
 *   node tools/live-check/panel.mjs flipcomps <listing-url>…
 * Prints the panel text, or what the page showed instead (e.g. a captcha: we stop there).
 * Needs: pnpm build <slug>
 */
import { chromium } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [slug, ...urls] = process.argv.slice(2);
if (!slug || !urls.length) { console.error('Usage: node tools/live-check/panel.mjs <slug> <url>…'); process.exit(1); }
const DIST = path.join(ROOT, 'extensions', slug, 'dist');
const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'panel-live-')), {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});
let [worker] = ctx.serviceWorkers();
if (!worker) worker = await ctx.waitForEvent('serviceworker');
for (const p of ctx.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();
for (const url of urls) {
  const page = await ctx.newPage();
  console.log(`\n=== ${url}`);
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log(`  ✗ ${e.message.split('\n')[0]}`); continue; }
  await page.waitForTimeout(7000);
  const r = await page.evaluate(() => ({
    title: document.title.slice(0, 100),
    blocked: /captcha|verify you are human|pardon our interruption|access denied|are you a robot/i.test(document.body?.innerText ?? ''),
    panel: [...document.querySelectorAll('[data-x-ext-ui]')].map((h) => (h.shadowRoot ?? h).textContent?.replace(/\s+/g, ' ').replace(/:host.*?\}\s*(?=[A-Z])/s, '').trim()).join(' | '),
  }));
  console.log(`  page: ${r.title}${r.blocked ? '  (site showed a bot check: not continuing)' : ''}`);
  console.log(r.panel ? `  panel: ${r.panel.replace(/^[^]*?\}(?=[^{}]*$)/, '').slice(0, 600)}` : '  ✗ no panel');
  await page.close();
}
await ctx.close();
