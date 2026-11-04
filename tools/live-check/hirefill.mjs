#!/usr/bin/env node
/**
 * Live smoke check for HireFill on real, public application forms.
 *   node tools/live-check/hirefill.mjs <application-url> [more urls…]
 *
 * Loads the dev build, seeds a test profile, clicks "Fill with HireFill" and
 * prints every field with its status. It NEVER submits: HireFill refuses to
 * click submit buttons and this script doesn't click anything else.
 * Needs: pnpm build hirefill
 */
import { chromium } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'extensions/hirefill/dist');

const PROFILE = {
  firstName: 'Jane', lastName: 'Doe', preferredName: '', email: 'jane.doe@example.com', phone: '+1 512 555 0142', phoneCountryCode: '1',
  address1: '', city: 'Austin', state: 'TX', postalCode: '78701', country: 'United States', linkedin: 'https://linkedin.com/in/janedoe', github: 'https://github.com/janedoe', website: 'https://janedoe.dev',
  headline: 'Senior Software Engineer', summary: '', skills: ['Python', 'Go'],
  work: [{ title: 'Senior Software Engineer', company: 'Stripe', location: 'Remote', start: '2021-01', end: '', current: true, description: 'Led migration of 40 services to Kubernetes' }],
  education: [{ school: 'University of Texas at Austin', degree: "Bachelor's", field: 'Computer Science', start: '2014', end: '2018', gpa: '' }],
  answers: { authorizedToWork: 'yes', needSponsorship: 'no', noticePeriod: '2 weeks', salaryExpectation: '150000', willingToRelocate: 'no', yearsExperience: '8', howDidYouHear: 'Company website', gender: 'Prefer not to say', ethnicity: 'Prefer not to say', veteran: 'Prefer not to say', disability: 'Prefer not to say' },
};

const urls = process.argv.slice(2);
if (!urls.length) { console.error('Usage: node tools/live-check/hirefill.mjs <application-url>…'); process.exit(1); }

const ctx = await chromium.launchPersistentContext(await mkdtemp(path.join(tmpdir(), 'hf-live-')), {
  channel: 'chromium', headless: true, args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});
let [worker] = ctx.serviceWorkers();
if (!worker) worker = await ctx.waitForEvent('serviceworker');
for (const p of ctx.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();
await worker.evaluate((p) => chrome.storage.local.set({ profile: p }), PROFILE);

let exit = 0;
for (const url of urls) {
  const page = await ctx.newPage();
  let submits = 0;
  page.on('request', (r) => { if (r.method() === 'POST' && /submit|applications?\b|apply/i.test(r.url()) && !/analytics|log|track/i.test(r.url())) submits++; });
  console.log(`\n=== ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const btn = page.locator('[data-hf-ui]').getByText('Fill with HireFill');
  try { await btn.waitFor({ timeout: 20000 }); } catch { console.log('✗ HireFill button never appeared (page not recognised as an application form)'); exit = 1; await page.close(); continue; }
  page.on('console', (m) => { if (m.type() === 'error' || /hirefill/i.test(m.text())) console.log(`  [console.${m.type()}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.slice(0, 200)}`));
  const t0 = Date.now();
  await btn.click();
  const text = () => page.evaluate(() => [...document.querySelectorAll('[data-hf-ui]')].map((h) => [...(h.shadowRoot ?? h).querySelectorAll('div,button,span,p')].map((n) => n.textContent).join(' ')).join(' '));
  await page.waitForTimeout(1500);
  while (/Filling…/.test(await text()) && Date.now() - t0 < 90000) await page.waitForTimeout(500);
  console.log(`  Fill took ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const says = await page.evaluate(() => [...document.querySelectorAll('[data-hf-ui]')].map((h) => [...(h.shadowRoot ?? h).querySelectorAll("div,button,span,p")].map((n) => n.textContent).join(" ")).join(' | '));
  console.log(`  HireFill says: ${says.replace(/\s+/g, ' ').slice(0, 300)}`);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-hf-status]')].map((el) => {
    const forLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
    const near = el.closest('.field, .application-question, [data-automation-id^="formField-"], li, div')?.querySelector('label, legend')?.textContent;
    const label = (forLabel || near || el.getAttribute('name') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    if (el.type === 'radio' || el.type === 'checkbox') {
      const group = el.name ? [...document.querySelectorAll(`input[name="${CSS.escape(el.name)}"]`)] : [el];
      const q = el.closest('.application-question, fieldset, li, [role=radiogroup], [role=group]')?.querySelector('.application-label, legend, .text, label')?.textContent ?? el.name;
      const picked = group.filter((g) => g.checked).map((g) => g.closest('label')?.textContent?.trim() ?? g.value).join(', ');
      return { status: el.getAttribute('data-hf-status'), label: q.trim().replace(/\s+/g, ' ').slice(0, 70), value: picked || '(none)' };
    }
    const shown = el.getAttribute('role') === 'combobox' ? el.closest('[class*="control"]')?.querySelector('[class*="single-value"], [class*="singleValue"]')?.textContent : null;
    const v = shown ?? (el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent : null) ?? el.value ?? el.textContent ?? '';
    return { status: el.getAttribute('data-hf-status'), label, value: String(v).trim().slice(0, 40) };
  }));
  const picked = await page.evaluate(() => [...document.querySelectorAll('input[type=radio]:checked, input[type=checkbox]:checked')].map((i) => {
    const q = i.closest('.application-question, fieldset, [role=radiogroup], [role=group], li')?.querySelector('.application-label, legend, .text')?.textContent ?? i.name;
    return `☑ ${q.trim().replace(/\s+/g, ' ').slice(0, 70)}  →  ${(i.closest('label')?.textContent ?? i.value).trim()}`;
  }));
  rows.push(...[]);
  const by = (s) => rows.filter((r) => r.status === s);
  for (const r of rows) console.log(`${{ filled: '🟢', check: '🟡', 'needs-you': '🔴' }[r.status] ?? '·'} ${r.label}${r.value ? `  →  ${r.value}` : ''}`);
  for (const l of picked) console.log(l);
  console.log(`Summary: ${by('filled').length} filled, ${by('check').length} to check, ${by('needs-you').length} need you. Submit requests: ${submits}`);
  if (submits) exit = 1;
  await page.close();
}
await ctx.close();
process.exit(exit);
