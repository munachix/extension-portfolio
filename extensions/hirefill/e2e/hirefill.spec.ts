/** HireFill end-to-end: real dev build, application forms served locally at real portal URLs. */
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getStorage, launchExtension, serveFixture, setStorage, type ExtensionHarness } from '../../../packages/testing/src/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const fx = (f: string) => path.join(here, '../test/fixtures', f);
const GH = 'https://job-boards.greenhouse.io/example/jobs/123';
const LV = 'https://jobs.lever.co/example/abc-123/apply';
const WD = 'https://example.wd5.myworkdayjobs.com/en-US/careers/job/Backend_R1/apply';
const PRO = { key: 'TEST-PRO-0000-0000', result: { valid: true, plan: 'pro', expiresAt: null }, checkedAt: Date.now() };

const CV_LINES = ['Jane Doe', 'Austin, TX | jane.doe@example.com | +1 512 555 0142 | linkedin.com/in/janedoe', 'Experience', 'Senior Software Engineer', 'Stripe | Remote', 'Jan 2021 - Present', '- Led migration of 40 services to Kubernetes', 'Software Engineer, Square', 'Jun 2018 - Dec 2020', '- Built fraud scoring in Python', 'Education', 'B.Sc. Computer Science, University of Texas at Austin', '2014 - 2018', 'Skills', 'Python, Go, PostgreSQL, Kubernetes'];

async function cvPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  CV_LINES.forEach((l, i) => page.drawText(l, { x: 50, y: 790 - i * 18, size: 11, font }));
  return Buffer.from(await doc.save());
}

const PROFILE = {
  firstName: 'Jane', lastName: 'Doe', preferredName: '', email: 'jane.doe@example.com', phone: '+1 512 555 0142', phoneCountryCode: '1',
  address1: '', city: 'Austin', state: 'TX', postalCode: '', country: 'United States', linkedin: 'https://linkedin.com/in/janedoe', github: 'https://github.com/janedoe', website: '',
  headline: 'Senior Software Engineer', summary: '', skills: ['Python', 'Go'],
  work: [
    { title: 'Senior Software Engineer', company: 'Stripe', location: 'Remote', start: '2021-01', end: '', current: true, description: 'Led migration of 40 services to Kubernetes' },
    { title: 'Software Engineer', company: 'Square', location: '', start: '2018-06', end: '2020-12', current: false, description: 'Built fraud scoring in Python' },
  ],
  education: [{ school: 'University of Texas at Austin', degree: 'B.Sc.', field: 'Computer Science', start: '2014', end: '2018', gpa: '' }],
  answers: { authorizedToWork: 'yes', needSponsorship: 'no', noticePeriod: '2 weeks', salaryExpectation: '150000', willingToRelocate: 'no', yearsExperience: '', howDidYouHear: 'Company website', gender: 'Prefer not to say', ethnicity: 'Prefer not to say', veteran: 'Prefer not to say', disability: 'Prefer not to say' },
};

let h: ExtensionHarness;
test.beforeEach(async () => {
  h = await launchExtension(DIST);
  for (const p of h.context.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();
  await serveFixture(h, GH, fx('greenhouse-apply.html'));
  await serveFixture(h, LV, fx('lever-apply.html'));
  await serveFixture(h, WD, fx('workday-apply.html'));
});
test.afterEach(async () => { await h.context.close(); });

async function seed(extra: Record<string, unknown> = {}) {
  const pdf = await cvPdf();
  await setStorage(h, { profile: PROFILE, 'file:resume': { name: 'Jane_Doe_CV.pdf', type: 'application/pdf', dataUrl: `data:application/pdf;base64,${pdf.toString('base64')}`, savedAt: '' }, ...extra });
}
const fillButton = (p: Page) => p.locator('[data-hf-ui] button.main');

test('Setup: a PDF CV is read on-device into a profile', async () => {
  const app = await h.context.newPage();
  await app.goto(`chrome-extension://${h.extensionId}/app.html?tab=Setup`);
  await app.locator('input[type=file]').setInputFiles({ name: 'Jane_Doe_CV.pdf', mimeType: 'application/pdf', buffer: await cvPdf() });
  await expect(app.getByText(/Done: found 2 job\(s\), 1 education entry/)).toBeVisible({ timeout: 15000 });
  const p = await getStorage<typeof PROFILE>(h, 'profile');
  expect(p).toMatchObject({ firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com' });
  expect(p.work[0]).toMatchObject({ title: 'Senior Software Engineer', company: 'Stripe', current: true });
});

test('Greenhouse: fills contact, resume, dropdown questions; leaves consent; never submits', async () => {
  await seed();
  const page = await h.context.newPage();
  await page.goto(GH);
  await fillButton(page).click();
  await expect(page.locator('[data-hf-ui] .sum')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#first_name')).toHaveValue('Jane');
  await expect(page.locator('#last_name')).toHaveValue('Doe');
  await expect(page.locator('#email')).toHaveValue('jane.doe@example.com');
  await expect(page.locator('#question_1')).toHaveValue('https://linkedin.com/in/janedoe');
  expect(await page.locator('#resume').evaluate((i: HTMLInputElement) => i.files?.[0]?.name)).toBe('Jane_Doe_CV.pdf');
  await expect(page.locator('#question_2').locator('xpath=ancestor::div[contains(@class,"select__value-container")]')).toContainText('No');
  await expect(page.locator('#question_3').locator('xpath=ancestor::div[contains(@class,"select__value-container")]')).toContainText('Yes');
  await expect(page.locator('#gender').locator('xpath=ancestor::div[contains(@class,"select__value-container")]')).toContainText('Decline To Self Identify');
  await expect(page.locator('#privacy')).not.toBeChecked();
  await expect(page.locator('#privacy')).toHaveAttribute('data-hf-status', 'needs-you');
  await expect(page.locator('#first_name')).toHaveAttribute('data-hf-status', 'filled');
  expect(await page.evaluate(() => (window as unknown as { __submits?: number }).__submits ?? 0)).toBe(0);
  // logged in the tracker
  await expect.poll(async () => (await getStorage<{ company: string }[]>(h, 'applications'))?.length ?? 0).toBe(1);
});

test('Answer Bank: a typed answer is offered for saving, then reused elsewhere', async () => {
  await seed();
  const page = await h.context.newPage();
  await page.goto(GH);
  await fillButton(page).click();
  await expect(page.locator('[data-hf-ui] .sum')).toBeVisible({ timeout: 10000 });
  await page.locator('#question_4').fill('I have built payment systems for five years and love developer tools.');
  await page.locator('#question_4').blur();
  await page.locator('[data-hf-ui] .toast button').click();
  await expect.poll(async () => (await getStorage<{ question: string }[]>(h, 'answers'))?.[0]?.question).toContain('Why do you want to work at Example');
  await page.locator('#question_4').fill('');
  await expect(fillButton(page)).toHaveText('Fill again');
  await fillButton(page).click();
  await expect(page.locator('#question_4')).toHaveValue(/payment systems/);
  await expect(page.locator('#question_4')).toHaveAttribute('data-hf-status', 'check');
});

test('Lever: full name, company, links and radio questions', async () => {
  await seed();
  const page = await h.context.newPage();
  await page.goto(LV);
  await fillButton(page).click();
  await expect(page.locator('input[name=name]')).toHaveValue('Jane Doe', { timeout: 10000 });
  await expect(page.locator('input[name=org]')).toHaveValue('Stripe');
  await expect(page.locator('input[name="urls[GitHub]"]')).toHaveValue('https://github.com/janedoe');
  await expect(page.locator('input[name="cards[abc][field0]"][value=Yes]')).toBeChecked();
  await expect(page.locator('input[name="cards[def][field0]"][value=No]')).toBeChecked();
  await expect(page.locator('input[value="Prefer not to disclose"]')).toBeChecked();
  expect(await page.evaluate(() => (window as unknown as { __submits?: number }).__submits ?? 0)).toBe(0);
});

test('Workday: dropdowns, work history with Add + dates, and the next page after the user clicks Next', async () => {
  await seed();
  const page = await h.context.newPage();
  await page.goto(WD);
  await fillButton(page).click();
  await expect(page.locator('[data-automation-id=legalNameSection_firstName]')).toHaveValue('Jane', { timeout: 10000 });
  await expect(page.locator('button[data-automation-id=countryDropdown]')).toHaveText('United States of America');
  await expect(page.locator('button[data-automation-id=phone-device-type]')).toHaveText('Mobile');
  await expect(page.locator('[data-automation-id=phone-number]')).toHaveValue('+1 512 555 0142');
  expect(await page.evaluate(() => (window as unknown as { __submits: number }).__submits)).toBe(0);

  await page.locator('#next').click(); // the user moves on
  await expect(page.locator('[data-automation-id^="workExperience-"]')).toHaveCount(2, { timeout: 10000 });
  await expect(page.locator('[data-automation-id=workExperience-1] [data-automation-id=jobTitle]')).toHaveValue('Senior Software Engineer');
  await expect(page.locator('[data-automation-id=workExperience-2] [data-automation-id=company]')).toHaveValue('Square');
  await expect(page.locator('[data-automation-id=workExperience-1] [data-automation-id=currentlyWorkHere]')).toBeChecked();
  await expect(page.locator('[data-automation-id=workExperience-2] [data-automation-id="formField-startDate"] [data-automation-id=dateSectionMonth-input]')).toHaveValue('06');
  await expect(page.locator('[data-automation-id=workExperience-2] [data-automation-id="formField-endDate"] [data-automation-id=dateSectionYear-input]')).toHaveValue('2020');
  expect(await page.locator('[data-automation-id=file-upload-input-ref]').evaluate((i: HTMLInputElement) => i.files?.length)).toBe(1);

  await page.locator('#next').click();
  await expect(page.locator('button[data-automation-id=q1]')).toHaveText('Yes', { timeout: 10000 });
  await expect(page.locator('button[data-automation-id=q2]')).toHaveText('No');
  expect(await page.evaluate(() => (window as unknown as { __submits: number }).__submits)).toBe(0);
});

test('Free plan: autofill never runs out; AI drafts stop after the free tries', async () => {
  await seed({ fillCount: 500, aiUses: 5 });
  const page = await h.context.newPage();
  await page.goto(GH);
  await fillButton(page).click();
  await expect(page.locator('#first_name')).toHaveValue('Jane', { timeout: 10000 });
  const app = await h.context.newPage();
  await app.goto(`chrome-extension://${h.extensionId}/app.html?tab=Tailor`);
  await expect(app.locator('body')).toContainText('used the 5 free AI drafts');
  await app.getByRole('button', { name: 'Draft answer' }).click();
  await expect(app.locator('body')).toContainText('Free AI drafts used up');
});

test('Pro: unlimited fills; tailored CV export downloads a PDF', async () => {
  await seed({ fillCount: 99, license: PRO });
  const page = await h.context.newPage();
  await page.goto(GH);
  await fillButton(page).click();
  await expect(page.locator('#first_name')).toHaveValue('Jane', { timeout: 10000 });
  const app = await h.context.newPage();
  await app.goto(`chrome-extension://${h.extensionId}/app.html?tab=Tailor`);
  const dl = app.waitForEvent('download');
  await app.getByRole('button', { name: 'Download PDF' }).click();
  const d = await dl;
  expect(d.suggestedFilename()).toBe('Jane_Doe_CV.pdf');
  expect(await d.path()).toBeTruthy(); // finished downloading
});
