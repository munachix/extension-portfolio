/**
 * End-to-end: the real dev build loaded into Chromium, job pages served from
 * local fixtures at their real URLs. Run with: pnpm test workfromwhere
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtension, serveFixture, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const fx = (f: string) => path.join(here, '../test/fixtures', f);
const NG = { settings: { country: 'NG', timeZone: 'Africa/Lagos', hideRed: false, listBadges: true, customRed: [], customGreen: [] } };

let h: ExtensionHarness;
test.beforeEach(async () => {
  h = await launchExtension(DIST);
  await setStorage(h, NG);
});
test.afterEach(async () => {
  await h.context.close();
});

const badge = (page: import('@playwright/test').Page) => page.locator('[data-wfw-badge] .b');

test('LinkedIn: US-only job is red, with the sentence quoted and highlighted', async () => {
  await serveFixture(h, 'https://www.linkedin.com/jobs/view/101/', fx('linkedin-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/101/');
  await expect(badge(page)).toHaveClass(/s-red/, { timeout: 5000 });
  await expect(badge(page)).toContainText('Restricted');
  await expect(badge(page)).toContainText('United States');
  await expect(badge(page).locator('.quote')).toContainText('This role is open to US residents only.');
  // The badge sits right above the description
  const before = await page.evaluate(() => document.querySelector('[data-wfw-badge]')?.nextElementSibling?.className);
  expect(before).toContain('jobs-box__html-content');
});

test('LinkedIn: badge survives in-page navigation', async () => {
  await serveFixture(h, 'https://www.linkedin.com/jobs/view/101/', fx('linkedin-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/101/');
  await expect(badge(page)).toHaveClass(/s-red/, { timeout: 5000 });
  await page.evaluate(() => (window as unknown as { goToJob: (id: number, html: string, loc: string) => void })
    .goToJob(102, '<p>We hire worldwide. Work from anywhere.</p>', 'EMEA'));
  await expect(badge(page)).toHaveClass(/s-green/, { timeout: 5000 });
  await expect(badge(page)).toContainText('Open');
  expect(page.url()).toContain('/jobs/view/102/');
});

test('Greenhouse: "We hire worldwide" is green; time-zone note shown', async () => {
  await serveFixture(h, 'https://job-boards.greenhouse.io/example/jobs/1', fx('greenhouse-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://job-boards.greenhouse.io/example/jobs/1');
  await expect(badge(page)).toHaveClass(/s-green/, { timeout: 5000 });
  await expect(badge(page)).toContainText('Open worldwide');
  await expect(badge(page).locator('.tz')).toContainText('US Eastern');
  await expect(badge(page).locator('.tz .pro')).toBeVisible(); // local-time conversion is Pro
});

test('SEEK: no rule in the text, so the location field decides', async () => {
  await serveFixture(h, 'https://nz.seek.com/job/95627538', fx('seek-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://nz.seek.com/job/95627538');
  await expect(badge(page)).toHaveClass(/s-red/, { timeout: 5000 });
  await expect(badge(page)).toContainText('New Zealand');
  await setStorage(h, { settings: { ...NG.settings, country: 'NZ', timeZone: 'Pacific/Auckland' } });
  await expect(badge(page)).toHaveClass(/s-green/, { timeout: 5000 });
});

test('Free: list badges, no hiding. Pro (test key): hide restricted', async () => {
  await serveFixture(h, 'https://weworkremotely.com/remote-jobs', fx('wwr-list.html'));
  await setStorage(h, { ...NG, settings: { ...(NG as { settings: object }).settings, hideRed: true } });
  const page = await h.context.newPage();
  await page.goto('https://weworkremotely.com/remote-jobs');
  await expect(page.locator('[data-wfw-pill]')).toHaveCount(2, { timeout: 5000 });
  await expect(page.locator('li.new-listing-container').first()).toBeVisible(); // hiding is Pro

  // Activate Pro through the real options page with the dev-only test key
  const opts = await h.context.newPage();
  await opts.goto(`chrome-extension://${h.extensionId}/options.html`);
  await opts.getByPlaceholder('Paste your license key').fill('TEST-PRO-0000-0000');
  await opts.getByRole('button', { name: 'Activate' }).click();
  await expect(opts.getByText('Active')).toBeVisible();
  await opts.getByLabel('Hide jobs I can’t take').check();

  await page.bringToFront();
  await expect(page.locator('[data-wfw-pill]')).toHaveCount(2, { timeout: 5000 });
  await expect(page.locator('li.new-listing-container').nth(1).locator('[data-wfw-pill]')).toContainText('Open');
  await expect(page.locator('li.new-listing-container').first()).toBeHidden();
});

test('Pro: time-zone conversion and saving a job', async () => {
  await setStorage(h, { ...NG, license: { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() } });
  await serveFixture(h, 'https://job-boards.greenhouse.io/example/jobs/1', fx('greenhouse-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://job-boards.greenhouse.io/example/jobs/1');
  await expect(badge(page).locator('.tz')).toContainText('your time', { timeout: 5000 });
  await badge(page).getByRole('button', { name: /Save job/ }).click();
  await expect(badge(page).getByRole('button', { name: /Saved/ })).toBeVisible();
});

test('makes no network requests outside the page itself', async () => {
  await serveFixture(h, 'https://www.linkedin.com/jobs/view/101/', fx('linkedin-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/101/');
  await expect(badge(page)).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
  expect(h.blocked).toEqual([]);
});

test('list badges: exactly one pill per LinkedIn card', async () => {
  await setStorage(h, { ...NG, license: { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() } });
  await serveFixture(h, 'https://www.linkedin.com/jobs/view/101/', fx('linkedin-job.html'));
  const page = await h.context.newPage();
  await page.goto('https://www.linkedin.com/jobs/view/101/');
  await expect(page.locator('[data-wfw-pill]')).toHaveCount(3, { timeout: 5000 });
  await expect(page.locator('li[data-occludable-job-id="102"] [data-wfw-pill]')).toContainText('Open');
  await expect(badge(page).locator('.quote')).toHaveCount(1);
});
