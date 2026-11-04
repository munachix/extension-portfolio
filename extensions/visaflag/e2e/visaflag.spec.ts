/** VisaFlag end-to-end: real dev build, sample datasets served at the data URL, no live sites. */
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { launchExtension, serveBody, serveFixture, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';
import cfg from '../extension.config.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const BASE = cfg.dataBaseUrl.replace(/\/$/, '');
const JOB = 'https://www.linkedin.com/jobs/view/123/';
const PRO = { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() };

const DATA = {
  us: { country: 'us', updated: 'FY2026 Q3', source: 'dol', fields: ['name', 'filingsPrevYear', 'filingsThisYear', 'medianWage', 'state'], meta: { thisYear: 'FY2026 (through Q3)', prevYear: 'FY2025' }, rows: [['Google LLC', 4200, 3100, 182000, 'CA'], ['Monzo Inc.', 3, 2, 150000, 'NY']] },
  uk: { country: 'uk', updated: '2026-11-04', source: 'gov.uk', fields: ['name', 'town', 'rating', 'routes'], rows: [['Google (UK) Limited', 'London', 'A', 'Skilled Worker'], ['Monzo Bank Limited', 'London', 'A', 'Skilled Worker|Global Business Mobility: Senior or Specialist Worker']] },
  ca: { country: 'ca', updated: '2026Q2', source: 'open.canada.ca', fields: ['name', 'positions', 'lastQuarter', 'provinces'], rows: [['Google Canada Corporation', 12, '2026Q2', 'Ontario']] },
  nl: { country: 'nl', updated: '2026-11-04', source: 'ind.nl', fields: ['name', 'kvk'], rows: [['Google Netherlands B.V.', '34198589']] },
};

let h: ExtensionHarness;
test.beforeEach(async () => {
  h = await launchExtension(DIST);
  const index = { version: 1, countries: Object.fromEntries(Object.entries(DATA).map(([cc, d]) => [cc, { updated: d.updated, count: d.rows.length, file: `sponsors-${cc}.json.gz` }])) };
  await serveBody(h, `${BASE}/index.json`, JSON.stringify(index), 'application/json');
  for (const [cc, d] of Object.entries(DATA)) await serveBody(h, `${BASE}/sponsors-${cc}.json.gz`, gzipSync(JSON.stringify(d)), 'application/gzip');
  await serveFixture(h, JOB, path.join(here, '../test/fixtures/linkedin-job.html'));
});
test.afterEach(async () => { await h.context.close(); });

async function setup(items: Record<string, unknown>) {
  await setStorage(h, items);
  const opts = await h.context.newPage();
  await opts.goto(`chrome-extension://${h.extensionId}/options.html`);
  await opts.evaluate(() => chrome.runtime.sendMessage({ type: 'vf:sync', force: true }));
  return opts;
}
const badge = (p: Page) => p.locator('.job-details-jobs-unified-top-card__company-name + [data-vf-badge]');

test('Free, US: Google shows as an H-1B sponsor; numbers are Pro', async () => {
  await setup({ settings: { countries: ['us'], listBadges: true, hideNonSponsors: false } });
  const page = await h.context.newPage();
  await page.goto(JOB);
  await expect(badge(page).locator('button.p')).toHaveCount(1, { timeout: 8000 });
  await expect(badge(page).locator('button.p')).toContainText('Sponsor');
  await badge(page).locator('button.p').click();
  await expect(badge(page).locator('.pop')).toContainText('Registered as “Google LLC”');
  await expect(badge(page).locator('.pop')).toContainText('H-1B filing counts and salaries: Pro');
  await expect(page.locator('[data-occludable-job-id] [data-vf-badge]')).toHaveCount(0); // list badges are Pro
});

test('Free, UK: "Google" is a likely match for "Google (UK) Limited"', async () => {
  await setup({ settings: { countries: ['uk'], listBadges: true, hideNonSponsors: false } });
  const page = await h.context.newPage();
  await page.goto(JOB);
  await expect(badge(page).locator('button.p')).toContainText('Likely sponsor', { timeout: 8000 });
});

test('Pro: all 4 countries, US numbers, list badges and hiding non-sponsors', async () => {
  await setup({ license: PRO, settings: { countries: ['us', 'uk', 'ca', 'nl'], listBadges: true, hideNonSponsors: true } });
  const page = await h.context.newPage();
  await page.goto(JOB);
  await expect(badge(page).locator('button.p')).toHaveCount(4, { timeout: 8000 });
  await badge(page).locator('button.p').first().click();
  await expect(badge(page).locator('.pop')).toContainText('3,100 certified H-1B in FY2026 (through Q3)');
  await expect(badge(page).locator('.pop')).toContainText('median offer $182,000');
  await expect(page.locator('[data-occludable-job-id="1"] [data-vf-badge] button.p')).toHaveCount(4);
  await expect(page.locator('[data-occludable-job-id="2"]')).toBeHidden(); // Tiny Startup Labs: on no register
});

test('popup shows each dataset and when it was updated', async () => {
  const opts = await setup({ license: PRO, settings: { countries: ['us', 'uk'], listBadges: true, hideNonSponsors: false } });
  await opts.reload();
  await expect(opts.getByText(/2 employers · updated (4 Nov 2026|Nov 4, 2026)/)).toBeVisible({ timeout: 8000 });
  await expect(opts.getByText('updated FY2026 Q3')).toBeVisible();
});

test('Pro search box finds any company', async () => {
  const opts = await setup({ license: PRO, settings: { countries: ['uk'], listBadges: true, hideNonSponsors: false } });
  await opts.reload();
  await opts.getByPlaceholder('Company name, e.g. Monzo').fill('Monzo');
  await opts.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(opts.getByText('“Monzo Bank Limited”')).toBeVisible();
});

test('only talks to the data host', async () => {
  await setup({ settings: { countries: ['us'], listBadges: true, hideNonSponsors: false } });
  const page = await h.context.newPage();
  await page.goto(JOB);
  await expect(badge(page)).toBeVisible({ timeout: 8000 });
  expect(h.blocked.filter((u) => !u.startsWith(BASE))).toEqual([]);
});
