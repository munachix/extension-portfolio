import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtension, serveFixture, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL_ = 'https://qbo.intuit.com/app/reconcile';
const PRO = { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() };
let h: ExtensionHarness;
test.beforeEach(async () => { h = await launchExtension(path.resolve(here, '../dist')); await serveFixture(h, URL_, path.join(here, '../test/fixtures/qbo-reconcile.html')); });
test.afterEach(async () => { await h.context.close(); });
const panel = (p: import('@playwright/test').Page) => p.locator('[data-rf-ui] .box');

test('Reconcile page: reads the $89 difference and points at the unticked $89 deposit', async () => {
  const p = await h.context.newPage();
  await p.goto(URL_);
  await expect(panel(p)).toContainText('Difference $89.00', { timeout: 8000 });
  await expect(panel(p)).toContainText('5 transactions on screen');
  await expect(panel(p).locator('.s').first()).toContainText('Not ticked yet: 10/09/2026 Vendor refund $89.00');
  await expect(p.locator('tr[data-id=t4]')).toHaveAttribute('data-rf-suspect', '');
  await panel(p).locator('.s').first().click();
  await expect(p.locator('tr[data-id=t4]')).toHaveAttribute('data-rf-suspect', 'focus');
  await expect(p.locator('tr[data-id=t4] input')).not.toBeChecked(); // read-only
  await expect(p).toHaveTitle('Acme Bakery LLC · Reconcile');
});

test('updates when the user ticks a box, and says Balanced at $0.00', async () => {
  const p = await h.context.newPage();
  await p.goto(URL_);
  await expect(panel(p)).toContainText('Difference $89.00', { timeout: 8000 });
  await p.evaluate(() => { document.querySelector('.diff div:last-child')!.textContent = '$0.00'; (document.querySelector('tr[data-id=t4] input') as HTMLInputElement).checked = true; document.body.append(document.createElement('i')); });
  await expect(panel(p)).toContainText('Balanced', { timeout: 8000 });
});

test('Pro finds combinations', async () => {
  await setStorage(h, { license: PRO });
  const p = await h.context.newPage();
  await p.goto(URL_);
  await p.evaluate(() => { document.querySelector('.diff div:last-child')!.textContent = '$76.25'; document.body.append(document.createElement('i')); });
  await expect(panel(p)).toContainText('Tick 10/09/2026 Vendor refund $89.00 + Tick 10/12/2026 Coffee Shop −$12.75', { timeout: 8000 });
});

test('Free finds combinations on 3 reconciliations a month, then asks for Pro', async () => {
  const p = await h.context.newPage();
  await p.goto(URL_);
  await p.evaluate(() => { document.querySelector('.diff div:last-child')!.textContent = '$76.25'; document.body.append(document.createElement('i')); });
  await expect(panel(p)).toContainText('Tick 10/09/2026 Vendor refund $89.00 + Tick 10/12/2026 Coffee Shop −$12.75', { timeout: 8000 });
  await expect(panel(p)).toContainText('2 more reconciliations this month');
  const month = new Date().toISOString().slice(0, 7);
  await setStorage(h, { comboAllowance: { month, recs: ['/a', '/b', '/c'] } });
  await p.reload();
  await p.evaluate(() => { document.querySelector('.diff div:last-child')!.textContent = '$76.25'; document.body.append(document.createElement('i')); });
  await expect(panel(p)).toContainText('used this month’s 3 free combination searches', { timeout: 8000 });
  await expect(panel(p)).not.toContainText('Coffee Shop −$12.75');
});

test('Pro paste mode in the popup', async () => {
  await setStorage(h, { license: PRO });
  const p = await h.context.newPage();
  await p.goto(`chrome-extension://${h.extensionId}/popup.html`);
  await p.locator('#paste').fill('10/05/2026\tStaples\t-25.00\t✓\n10/07/2026\tClient A\t4200.00\t✓\n10/09/2026\tVendor refund\t89.00');
  await p.locator('#diff').fill('89.00');
  await p.getByRole('button', { name: 'Find the cause' }).click();
  await expect(p.locator('#out')).toContainText('Not ticked yet: 10/09/2026 Vendor refund $89.00');
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
