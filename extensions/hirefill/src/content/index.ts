/**
 * HireFill on application pages: a floating "Fill with HireFill" button.
 * Fills, colours each field (green filled / yellow check / red needs you),
 * offers to save new answers, and continues on the next page of multi-page
 * portals after YOU click Next. It never clicks Submit/Apply.
 */
import { isPro } from '@ext/core';
import { adapterFor, generic, watchPage } from '@ext/job-sites';
import { upsert } from '../answers/bank';
import { collectFields } from '../fill/fields';
import { fillPage, keyOf, type FillResult } from '../fill/engine';
import { db, FREE_FILLS, storedToFile, type Application } from '../store';

declare global { interface Window { __hfLoaded?: boolean } }

const UI = 'data-hf-ui';
const STATUS = 'data-hf-status';
const PORTALS: [RegExp, string][] = [[/myworkdayjobs|myworkdaysite|workday/i, 'Workday'], [/greenhouse/i, 'Greenhouse'], [/lever\.co/i, 'Lever'], [/icims/i, 'iCIMS'], [/taleo|oraclecloud/i, 'Taleo / Oracle'], [/smartrecruiters/i, 'SmartRecruiters'], [/ashbyhq/i, 'Ashby'], [/bamboohr/i, 'BambooHR'], [/workable/i, 'Workable'], [/applytojob|jazzhr/i, 'JazzHR'], [/successfactors|sapsf/i, 'SuccessFactors'], [/linkedin/i, 'LinkedIn'], [/indeed/i, 'Indeed']];
const portal = () => PORTALS.find(([re]) => re.test(location.hostname))?.[1] ?? location.hostname;

function style() {
  if (document.querySelector('style[data-hf-style]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-hf-style', '');
  s.setAttribute('data-x-ext-ui', '');
  s.textContent = `[${STATUS}="filled"]{outline:2px solid #12a150 !important;outline-offset:1px}[${STATUS}="check"]{outline:2px solid #e0a100 !important;outline-offset:1px}[${STATUS}="needs-you"]{outline:2px solid #d03b3b !important;outline-offset:1px}`;
  document.head.appendChild(s);
}

function mark(r: FillResult) {
  const target = r.field.kind === 'radio' || r.field.kind === 'checkboxGroup' ? (r.field.group![0].closest('fieldset, [role="radiogroup"], li, [data-automation-id^="formField-"]') ?? r.field.el) : r.field.kind === 'file' ? (r.field.el.closest('[class*="upload"], [data-automation-id*="upload"], div') ?? r.field.el) : r.field.el;
  if (r.status === 'skipped') (target as HTMLElement).removeAttribute(STATUS);
  else (target as HTMLElement).setAttribute(STATUS, r.status);
}

// ---------- floating panel ----------
const CSS = `:host{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483646;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.box{background:#fff;color:#16191d;border:1px solid #dcdbd5;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:10px;min-width:220px;max-width:320px}
button{all:unset;cursor:pointer;box-sizing:border-box;border-radius:8px;padding:8px 12px;font-weight:700;text-align:center}
.main{display:block;width:100%;background:#2457d6;color:#fff}.main:hover{background:#1c47b3}
.row{display:flex;gap:6px;margin-top:8px}.row button{flex:1;border:1px solid #dcdbd5;font-weight:600;font-size:12.5px;padding:6px 8px}
.sum{margin-top:8px;font-size:12.5px;color:#333}.sum b{font-weight:700}.g{color:#0d7a3e}.y{color:#8a6100}.r{color:#b42318}
.x{position:absolute;top:2px;right:6px;font-size:16px;color:#777;padding:2px 4px}
.note{margin-top:8px;font-size:12px;color:#555}.toast{margin-top:8px;padding:8px;border-radius:8px;background:#eef4ff;font-size:12.5px}`;

let host: HTMLElement | null = null;
let lastResults: FillResult[] = [];
let filledUrls = new Set<string>();
let busy = false;

function panel(): ShadowRoot {
  if (host?.isConnected) return host.shadowRoot!;
  host = document.createElement('div');
  host.setAttribute(UI, '');
  host.setAttribute('data-x-ext-ui', '');
  host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);
  return host.shadowRoot!;
}

function render(state: { summary?: FillResult[]; message?: string; toast?: { q: string; a: string } }) {
  const root = panel();
  root.replaceChildren();
  const st = document.createElement('style');
  st.textContent = CSS;
  const box = document.createElement('div');
  box.className = 'box';
  const close = Object.assign(document.createElement('button'), { className: 'x', textContent: '×', title: 'Hide' });
  close.addEventListener('click', () => host?.remove());
  const main = Object.assign(document.createElement('button'), { className: 'main', textContent: busy ? 'Filling…' : state.summary ? 'Fill again' : '⚡ Fill with HireFill' });
  main.addEventListener('click', () => void runFill());
  box.append(close, main);
  if (state.summary) {
    const n = (s: string) => state.summary!.filter((r) => r.status === s).length;
    const sum = document.createElement('div');
    sum.className = 'sum';
    sum.innerHTML = `<b class="g">${n('filled')}</b> filled · <b class="y">${n('check')}</b> please check · <b class="r">${n('needs-you')}</b> need you`;
    const row = document.createElement('div');
    row.className = 'row';
    const next = Object.assign(document.createElement('button'), { textContent: 'Next empty field' });
    next.addEventListener('click', focusNextEmpty);
    const app = Object.assign(document.createElement('button'), { textContent: 'Open HireFill' });
    app.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'hf:openPanel' }));
    row.append(next, app);
    box.append(sum, row);
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Review everything, then click Submit yourself. HireFill never submits.';
    box.append(note);
  }
  if (state.message) { const m = document.createElement('div'); m.className = 'note'; m.textContent = state.message; box.append(m); }
  if (state.toast) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = 'Save this answer for similar questions next time? ';
    const yes = Object.assign(document.createElement('button'), { textContent: 'Save', style: 'padding:3px 8px;background:#2457d6;color:#fff;margin-left:4px' });
    yes.addEventListener('click', async () => { await db.saveAnswers(upsert(await db.answers(), state.toast!.q, state.toast!.a)); render({ summary: lastResults.length ? lastResults : undefined, message: 'Saved to your Answer Bank.' }); });
    t.append(yes);
    box.append(t);
  }
  root.append(st, box);
}

function focusNextEmpty() {
  const els = [...document.querySelectorAll<HTMLElement>(`[${STATUS}="needs-you"], [${STATUS}="check"]`)];
  const el = els.find((e) => e.getBoundingClientRect().top > 80) ?? els[0];
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (el.matches('input,select,textarea,button') ? el : el.querySelector<HTMLElement>('input,select,textarea,button'))?.focus();
}

// ---------- filling ----------
async function runFill(auto = false) {
  if (busy) return;
  const pro = await isPro();
  const used = await db.fills();
  const isNewApplication = !filledUrls.has(applicationKey());
  if (!pro && isNewApplication && used >= FREE_FILLS) {
    render({ message: `You’ve used your ${FREE_FILLS} free fills. Get HireFill for $39 once (no subscription) to keep going.` });
    chrome.runtime.sendMessage({ type: 'hf:openPanel', tab: 'settings' });
    return;
  }
  busy = true;
  render({});
  style();
  try {
    const [profile, answers, resumeS, tailoredS, settings] = await Promise.all([db.profile(), db.answers(), db.file('resume'), db.file('tailored'), db.settings()]);
    if (!profile.email && !profile.firstName) { busy = false; render({ message: 'Set up your profile first: upload your CV in HireFill.' }); chrome.runtime.sendMessage({ type: 'hf:openPanel' }); return; }
    const resume = tailoredS ? await storedToFile(tailoredS) : resumeS ? await storedToFile(resumeS) : undefined;
    lastResults = await fillPage({ profile, answers, files: { resume } });
    lastResults.forEach(mark);
    const filled = lastResults.filter((r) => r.status === 'filled' || r.status === 'check').length;
    if (filled >= 3 && isNewApplication) {
      filledUrls.add(applicationKey());
      await db.countFill();
      await logApplication(tailoredS?.name ?? resumeS?.name ?? '');
    }
    busy = false;
    render({ summary: lastResults, message: auto ? 'Filled this page too.' : undefined });
    armNextPage(settings.autoNextPage);
  } catch (e) {
    busy = false;
    render({ message: `Something went wrong: ${(e as Error).message}` });
  }
}

/** Multi-page portals keep one application across pages. */
function applicationKey() {
  return /workday/i.test(location.hostname) ? location.pathname.replace(/\/(apply|applyManually|autofillWithResume|useMyLastApplication)?\/?[^/]*$/, '') : location.origin + location.pathname;
}

async function logApplication(cv: string) {
  const job = (adapterFor(new URL(location.href)) ?? generic).readJob(document);
  const title = document.title.replace(/\s*[|\-–]\s*(Workday|Greenhouse|Lever|LinkedIn|Indeed).*$/i, '');
  const company = job?.companyText || title.match(/\bat\s+(.+)$/i)?.[1] || location.hostname.split('.')[0];
  const role = job?.titleText || title.replace(/^job application for\s+/i, '').replace(/\s+at\s+.+$/i, '');
  const apps = await db.apps();
  const app: Application = { id: crypto.randomUUID(), company: company.trim(), role: role.trim(), url: location.href, portal: portal(), date: new Date().toISOString(), status: 'Applied', cv, followUp: new Date(Date.now() + 7 * 86400000).toISOString() };
  await db.saveApps([app, ...apps]);
}

let nextPageArmed = false;
function armNextPage(enabled: boolean) { nextPageArmed = enabled; }

function fillableCount(): number {
  return collectFields().filter((f) => keyOf(f)).length;
}

// Answer Bank: offer to save answers typed into questions we didn't know
function watchAnswers() {
  document.addEventListener('change', (e) => {
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === 'text'))) return;
    if (el.closest('[data-x-ext-ui]') || el.value.trim().length < 25) return;
    const f = collectFields(el.parentElement ?? document).find((x) => x.el === el);
    if (!f || f.label.length < 12 || keyOf(f)) return;
    render({ summary: lastResults.length ? lastResults : undefined, toast: { q: f.label, a: el.value.trim() } });
  }, true);
}

async function main() {
  const settings = await db.settings();
  let shown = false;
  let lastSig = '';
  watchPage(() => {
    const n = fillableCount();
    if (n >= 3 && settings.showButton && !shown) { shown = true; render({}); }
    // Next page of a multi-page application: fill it once the user moved on
    const sig = `${location.href}|${n}`;
    if (nextPageArmed && sig !== lastSig && n >= 2 && !busy) {
      const empty = collectFields().filter((f) => keyOf(f) && !f.el.hasAttribute(STATUS)).length;
      if (empty >= 2) void runFill(true);
    }
    lastSig = sig;
  }, { debounceMs: 600 });
  watchAnswers();
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg?.type === 'hf:fill') { void runFill().then(() => reply({ ok: true })); return true; }
    if (msg?.type === 'hf:job') {
      const job = (adapterFor(new URL(location.href)) ?? generic).readJob(document);
      reply({ company: job?.companyText ?? '', role: job?.titleText ?? document.title, description: job?.descriptionEl?.textContent?.replace(/\s+\n/g, '\n').trim() ?? document.body.innerText.slice(0, 15000), url: location.href });
      return false;
    }
    if (msg?.type === 'hf:insert') {
      const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && 'value' in el) { el.value = msg.text; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); reply({ ok: true }); } else reply({ ok: false });
      return false;
    }
    return false;
  });
}

if (!window.__hfLoaded) { window.__hfLoaded = true; void main(); }
