#!/usr/bin/env node
/**
 * pnpm assets <slug>
 * Renders store artwork with Playwright from HTML/SVG sources in extensions/<slug>/store:
 *   icon.svg                 -> public/icons/{16,32,48,128}.png
 *   assets/promo.html        -> store/promo-440x280.png
 *   assets/screenshot-N.html -> store/screenshots/N-1280x800.png
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './build.mjs';

export async function renderAssets(slug) {
  const dir = path.join(ROOT, 'extensions', slug);
  const store = path.join(dir, 'store');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const svg = await readFile(path.join(store, 'icon.svg'), 'utf8');
    await mkdir(path.join(dir, 'public/icons'), { recursive: true });
    for (const size of [16, 32, 48, 128]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
      await page.screenshot({ path: path.join(dir, `public/icons/${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    }
    console.log('✓ icons');

    const assets = path.join(store, 'assets');
    if (existsSync(path.join(assets, 'promo.html'))) {
      await page.setViewportSize({ width: 440, height: 280 });
      await page.goto(pathToFileURL(path.join(assets, 'promo.html')).href);
      await page.screenshot({ path: path.join(store, 'promo-440x280.png') });
      console.log('✓ promo tile');
    }
    const shots = (await readdir(assets).catch(() => [])).filter((f) => /^screenshot-\d+\.html$/.test(f)).sort();
    if (shots.length) await mkdir(path.join(store, 'screenshots'), { recursive: true });
    for (const f of shots) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(pathToFileURL(path.join(assets, f)).href);
      const n = f.match(/\d+/)[0];
      await page.screenshot({ path: path.join(store, 'screenshots', `${n}-1280x800.png`) });
    }
    if (shots.length) console.log(`✓ ${shots.length} screenshots`);
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: pnpm assets <slug>'); process.exit(1); }
  renderAssets(slug).catch((e) => { console.error(e.message); process.exit(1); });
}
