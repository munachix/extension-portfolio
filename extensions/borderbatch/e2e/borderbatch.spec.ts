/** BorderBatch end-to-end: the real panel page, real JPEGs made in the browser, real downloads. */
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { launchExtension, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const PRO = { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() };
let h: ExtensionHarness;
test.beforeEach(async () => { h = await launchExtension(DIST); });
test.afterEach(async () => { await h.context.close(); });

/** A photo-like JPEG (gradient + noise), with an EXIF block containing GPS tags spliced in. */
async function makeJpeg(page: Page, w: number, h2: number): Promise<Buffer> {
  const b64 = await page.evaluate(async ([w, h]) => {
    const c = new OffscreenCanvas(w, h);
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#3a6ea5'); g.addColorStop(1, '#e8a33d');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `hsl(${(i * 37) % 360} 60% 50% / .35)`; x.fillRect((i * 7919) % w, (i * 104729) % h, 40, 40); }
    const jpg = new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: 0.92 })).arrayBuffer());
    // APP1 Exif segment with a GPSInfo pointer (0x8825) and "GPS" marker text
    const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, ...new TextEncoder().encode('GPS 6.5244N 3.3792E')];
    const payload = [...new TextEncoder().encode('Exif\0\0'), ...tiff];
    const len = payload.length + 2;
    const app1 = [0xff, 0xe1, len >> 8, len & 255, ...payload];
    const out = new Uint8Array(jpg.length + app1.length);
    out.set(jpg.subarray(0, 2)); out.set(app1, 2); out.set(jpg.subarray(2), 2 + app1.length);
    let s = ''; for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode(...out.subarray(i, i + 0x8000));
    return btoa(s);
  }, [w, h2] as const);
  return Buffer.from(b64, 'base64');
}

async function openPanel() {
  const p = await h.context.newPage();
  await p.goto(`chrome-extension://${h.extensionId}/panel.html`);
  return p;
}

test('6000×4000 JPEG → 1080×1350 with even white borders, under 1.5 MB, GPS removed', async () => {
  const p = await openPanel();
  const input = await makeJpeg(p, 6000, 4000);
  expect(input.includes(Buffer.from('Exif'))).toBe(true);
  await p.locator('#files').setInputFiles({ name: 'beach.jpg', mimeType: 'image/jpeg', buffer: input });
  await p.locator('#go').click();
  await expect(p.getByText('GPS removed')).toBeVisible({ timeout: 20000 });
  const dl = p.waitForEvent('download');
  await p.locator('.item button').first().click();
  const d = await dl;
  expect(d.suggestedFilename()).toBe('beach_4x5.jpg');
  const out = await readFile((await d.path())!);
  expect(out.length).toBeLessThan(1.5 * 1024 * 1024);
  expect(out.includes(Buffer.from('Exif'))).toBe(false);
  expect(out.includes(Buffer.from('GPS'))).toBe(false);
  const info = await p.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height); const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0);
    const px = (X: number, Y: number) => [...x.getImageData(X, Y, 1, 1).data].slice(0, 3);
    return { w: bmp.width, h: bmp.height, left: px(20, 675), right: px(1059, 675), top: px(540, 200), bottom: px(540, 1149), middle: px(540, 675) };
  }, out.toString('base64'));
  expect(info).toMatchObject({ w: 1080, h: 1350 });
  for (const k of ['left', 'right', 'top', 'bottom'] as const) for (const v of info[k]) expect(v).toBeGreaterThan(245); // white border
  expect(Math.min(...info.middle)).toBeLessThan(240); // photo, not border
});

test('Free: 5 photos per batch, no ZIP', async () => {
  const p = await openPanel();
  const jpg = await makeJpeg(p, 800, 600);
  await p.locator('#files').setInputFiles(Array.from({ length: 6 }, (_, i) => ({ name: `p${i}.jpg`, mimeType: 'image/jpeg', buffer: jpg })));
  await expect(p.locator('.item')).toHaveCount(5);
  await expect(p.locator('#msg')).toContainText('up to 5 photos');
  await p.locator('#go').click();
  await expect(p.getByText('GPS removed')).toHaveCount(5, { timeout: 20000 });
  await expect(p.locator('#zip')).toBeHidden();
});

test('Pro: a batch of 50 photos in under 30 s, downloaded as one ZIP', async () => {
  await setStorage(h, { license: PRO });
  const p = await openPanel();
  const jpg = await makeJpeg(p, 3000, 2000);
  await p.locator('#files').setInputFiles(Array.from({ length: 50 }, (_, i) => ({ name: `shot_${i}.jpg`, mimeType: 'image/jpeg', buffer: jpg })));
  const t0 = Date.now();
  await p.locator('#go').click();
  await expect(p.getByText('GPS removed')).toHaveCount(50, { timeout: 30000 });
  expect(Date.now() - t0).toBeLessThan(30000);
  const dl = p.waitForEvent('download');
  await p.locator('#zip').click();
  const zip = unzipSync(new Uint8Array(await readFile((await (await dl).path())!)));
  expect(Object.keys(zip)).toHaveLength(50);
});

test('Pro: carousel splitter turns a panorama into seamless 4:5 slides', async () => {
  await setStorage(h, { license: PRO, look: { preset: '4x5', border: 0, color: '#ffffff', quality: 0.9, sharpen: false, wmOn: false, wmText: '', wmCorner: 'br', wmOpacity: 0.7, wmSize: 0.2, wmColor: '#ffffff', carousel: true, tiles: 3 } });
  const p = await openPanel();
  await p.locator('#files').setInputFiles({ name: 'pano.jpg', mimeType: 'image/jpeg', buffer: await makeJpeg(p, 9000, 3000) });
  await expect(p.locator('#tiles')).toHaveValue('4'); // suggested from the panorama's shape
  await p.locator('#go').click();
  await expect(p.getByText(/4 file\(s\)/)).toBeVisible({ timeout: 20000 }); // 9000×3000 suggests 4 slides
});

test('store build rejects the dev test key', async () => {
  await h.context.close();
  h = await launchExtension(path.resolve(DIST, '../dist-prod'));
  const p = await openPanel();
  await p.getByPlaceholder('Paste your license key').fill('TEST-PRO-0000-0000');
  await p.getByRole('button', { name: 'Activate' }).click();
  await expect(p.getByText('That key is not valid.')).toBeVisible();
});
