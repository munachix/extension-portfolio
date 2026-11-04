import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtension, serveFixture, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => path.join(here, '../test/fixtures', f);
const PRO = { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() };
const ITEM = 'https://www.ebay.com/itm/123456789012';
const SOLD = 'https://www.ebay.com/sch/i.html?_nkw=nike+air+max+90&LH_Sold=1&LH_Complete=1';
const POSH = 'https://poshmark.com/listing/Lululemon-Align-65a1';
let h: ExtensionHarness;
test.beforeEach(async () => {
  h = await launchExtension(path.resolve(here, '../dist'));
  await serveFixture(h, ITEM, fx('ebay-item.html'));
  await serveFixture(h, SOLD, fx('ebay-sold.html'));
  await serveFixture(h, POSH, fx('poshmark-listing.html'));
});
test.afterEach(async () => { await h.context.close(); });
const panel = (p: import('@playwright/test').Page) => p.locator('[data-fc-ui] .box');

test('eBay listing: sold-search links and what you keep on every platform', async () => {
  await setStorage(h, { prefs: { cost: 20, shipCost: 10, buyerShipping: 0, target: 20, ebayCategory: 'most', depopBoosted: false } });
  const p = await h.context.newPage();
  await p.goto(ITEM);
  await expect(panel(p)).toContainText('Nike Air Max 90', { timeout: 8000 });
  await expect(panel(p).locator('a', { hasText: 'eBay sold' })).toHaveAttribute('href', 'https://www.ebay.com/sch/i.html?_nkw=Nike%20Air%20Max%2090%20White%20Black&LH_Sold=1&LH_Complete=1');
  // $85: eBay fee 85*13.6% + 0.40 = 11.96 → keep 85 - 11.96 - 10 ship - 20 cost = 43.04
  await expect(panel(p).locator('tr', { hasText: 'eBay' })).toContainText('$43.04');
  // Poshmark 20% = 17, buyer pays label → 85 - 17 - 20 = 48.00
  await expect(panel(p).locator('tr', { hasText: 'Poshmark' })).toContainText('$48.00');
  await expect(panel(p)).toContainText('PRO');
});

test('Poshmark listing price is read from page metadata', async () => {
  const p = await h.context.newPage();
  await p.goto(POSH);
  await expect(panel(p).locator('input').first()).toHaveValue('48', { timeout: 8000 });
});

test('Sold page: free shows the count; Pro shows median and typical range without outliers', async () => {
  const p = await h.context.newPage();
  await p.goto(SOLD);
  await expect(panel(p)).toContainText('10 sold items', { timeout: 8000 });
  await expect(panel(p)).not.toContainText('Median');
  await setStorage(h, { license: PRO });
  await p.reload();
  await expect(panel(p)).toContainText('Median $61.00', { timeout: 8000 });
  await expect(panel(p)).toContainText('8 of 10 sold items used (2 outliers removed)');
});

test('Pro: target-profit price and saving to inventory', async () => {
  await setStorage(h, { license: PRO, prefs: { cost: 20, shipCost: 10, buyerShipping: 0, target: 20, ebayCategory: 'most', depopBoosted: false } });
  const p = await h.context.newPage();
  await p.goto(ITEM);
  await expect(panel(p).locator('th', { hasText: 'For $20.00' })).toBeVisible({ timeout: 8000 });
  await panel(p).getByText('☆ Save to inventory').click();
  await expect(panel(p).getByText('★ Saved')).toBeVisible();
});

test('store build rejects the dev test key', async () => {
  await h.context.close();
  h = await launchExtension(path.resolve(here, '../dist-prod'));
  const p = await h.context.newPage();
  await p.goto(`chrome-extension://${h.extensionId}/popup.html`);
  await p.getByPlaceholder('Paste your license key').fill('TEST-PRO-0000-0000');
  await p.getByRole('button', { name: 'Activate' }).click();
  await expect(p.getByText('That key is not valid.')).toBeVisible();
});
