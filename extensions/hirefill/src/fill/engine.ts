/**
 * Fills an application page from the profile. Fills like a person would:
 * native value setter + input/change/blur events (what React/Angular forms need),
 * real option picks for custom dropdowns, files via DataTransfer.
 * Every click goes through safeClick, which refuses submit/apply buttons.
 */
import { findAnswer, type SavedAnswer } from '../answers/bank';
import type { Profile } from '../profile/schema';
import { collectFields, type Field } from './fields';
import { safeClick } from './guard';
import { classify, EDU_PATTERNS, KEY_PATTERNS, WORK_PATTERNS, WORKDAY_IDS, type Key } from './keys';
import { bestOption, norm } from './match';
import { wantFor, type Want } from './values';

export type Status = 'filled' | 'check' | 'needs-you' | 'skipped';
export interface FillResult { field: Field; key: Key | null; status: Status; note?: string }
export interface Files { resume?: File; coverLetter?: File }
export interface FillOptions { profile: Profile; files: Files; answers: SavedAnswer[]; wait?: (ms: number) => Promise<void>; onlyEmpty?: boolean }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function setNative(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
}
function fire(el: Element, ...types: string[]) {
  for (const t of types) el.dispatchEvent(new Event(t, { bubbles: true }));
}
function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.focus();
  setNative(el, value);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  fire(el, 'change');
  el.blur();
  fire(el, 'blur', 'focusout');
}
/** A full pointer + mouse sequence. Live react-select (Greenhouse) ignores a bare mousedown or keyboard events. */
function pointerClick(el: Element) {
  const r = el.getBoundingClientRect();
  const at = { bubbles: true, cancelable: true, composed: true, button: 0, view: window, clientX: r.left + Math.min(10, r.width / 2), clientY: r.top + r.height / 2 };
  for (const t of ['pointerover', 'pointerenter', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
    el.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, { ...at, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new MouseEvent(t, at));
  }
  safeClick(el);
}

/** What the field asks for. Portal ids beat labels; repeated blocks use work/edu patterns. */
export function keyOf(f: Field): Key | null {
  const wd = Object.entries(WORKDAY_IDS).find(([id]) => f.automationId === id || f.automationId.endsWith(`_${id}`) || f.hint.split(' ').includes(id));
  if (wd) return wd[1];
  const text = `${f.label} ${f.hint}`;
  if (/pronunciation|pronounce/i.test(text)) return null; // "How do you pronounce your name?" is yours to answer
  if (f.block) return classify(text, f.block.type === 'work' ? WORK_PATTERNS : EDU_PATTERNS) ?? classify(text);
  if (f.kind === 'file') return /cover/i.test(text) ? 'coverLetter' : 'resume';
  return classify(text, KEY_PATTERNS);
}

function currentValue(f: Field): string {
  if (f.kind === 'radio' || f.kind === 'checkboxGroup') return f.group!.filter((g) => g.checked).map((g) => g.value).join(',');
  if (f.kind === 'checkbox') return (f.el as HTMLInputElement).checked ? 'on' : '';
  if (f.kind === 'file') return (f.el as HTMLInputElement).files?.length ? 'file' : '';
  if (f.kind === 'listbox') return /select|choose|^$/i.test(norm(f.el.textContent ?? '')) ? '' : norm(f.el.textContent ?? '');
  if (f.kind === 'combobox') {
    const box = f.el.closest('.select, [class*="select__control"], [class*="container"]');
    const chosen = box?.querySelector('[class*="single-value"], [class*="multi-value"]')?.textContent;
    return chosen ?? (f.el as HTMLInputElement).value ?? '';
  }
  return (f.el as HTMLInputElement).value ?? '';
}

async function waitFor<T>(fn: () => T | null | undefined, ms = 1500, wait = sleep): Promise<T | null> {
  for (let t = 0; t < ms; t += 50) { const v = fn(); if (v) return v; await wait(50); }
  return null;
}

function visibleOptions(near?: Element): HTMLElement[] {
  const controls = near?.getAttribute('aria-controls') || near?.getAttribute('aria-owns');
  const scope = (controls && document.getElementById(controls)) || document;
  // react-select names its options after the input id; prefer those over any other list on the page (e.g. phone country pickers).
  if (near?.id) {
    const own = [...document.querySelectorAll<HTMLElement>(`[id^="react-select-${CSS.escape(near.id)}-option"]`)].filter((o) => o.getClientRects().length > 0);
    if (own.length) return own;
  }
  return [...scope.querySelectorAll<HTMLElement>('[role="option"], [data-automation-id="promptOption"], [class*="select__option"]')]
    .filter((o) => o.getClientRects().length > 0 && !o.closest('[data-x-ext-ui]'));
}

async function fillOne(f: Field, want: Want, files: Files, wait = sleep): Promise<Status> {
  const el = f.el;
  switch (f.kind) {
    case 'text':
    case 'textarea': {
      if (!want.text) return 'needs-you';
      typeInto(el as HTMLInputElement, want.text);
      return (el as HTMLInputElement).value === want.text ? 'filled' : 'check';
    }
    case 'date':
    case 'month': {
      if (!want.text) return 'needs-you';
      const v = f.kind === 'month' ? want.text.slice(0, 7) : /^\d{4}-\d{2}$/.test(want.text) ? `${want.text}-01` : want.text;
      typeInto(el as HTMLInputElement, v);
      return 'filled';
    }
    case 'select': {
      const sel = el as HTMLSelectElement;
      const i = bestOption(f.options!, want.choice ?? (want.text ? [want.text] : []));
      if (i < 0) return 'needs-you';
      sel.selectedIndex = i;
      fire(sel, 'input', 'change');
      return 'filled';
    }
    case 'radio':
    case 'checkboxGroup': {
      const i = bestOption(f.options!, want.choice ?? (want.text ? [want.text] : []));
      if (i < 0) return 'needs-you';
      const target = f.group![i];
      if (!target.checked) safeClick(target);
      return target.checked ? 'filled' : 'check';
    }
    case 'checkbox': {
      if (want.checked == null) return 'needs-you';
      const c = el as HTMLInputElement;
      if (c.checked !== want.checked) safeClick(c);
      return c.checked === want.checked ? 'filled' : 'check';
    }
    case 'file': {
      const file = want.file === 'coverLetter' ? files.coverLetter : files.resume;
      if (!file) return 'needs-you';
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = el as HTMLInputElement;
      input.files = dt.files;
      fire(input, 'input', 'change');
      return input.files?.length ? 'filled' : 'check';
    }
    case 'combobox': {
      const input = el as HTMLInputElement;
      const prefs = want.choice ?? (want.text ? [want.text] : []);
      if (!prefs.length) return 'needs-you';
      // 1. Open the full list (react-select, Workday) and pick from every option.
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
      if (!visibleOptions(input).length) pointerClick(input.closest('[class*="select__control"], [class*="-control"]') ?? input);
      const all = await waitFor(() => { const o = visibleOptions(input); return o.length ? o : null; }, 600, wait);
      if (all) {
        const i = bestOption(all.map((o) => o.textContent ?? ''), prefs);
        if (i >= 0) { pointerClick(all[i]); await wait(120); return 'filled'; }
      }
      // 2. Lists that only appear after typing (location search etc.)
      for (const p of prefs.slice(0, 3)) {
        input.focus();
        setNative(input, p);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: p, inputType: 'insertText' }));
        const opts = await waitFor(() => { const o = visibleOptions(input); return o.length ? o : null; }, 900, wait);
        if (!opts) continue;
        const i = bestOption(opts.map((o) => o.textContent ?? ''), prefs);
        if (i < 0) continue;
        pointerClick(opts[i]);
        await wait(120);
        return 'filled';
      }
      setNative(input, '');
      fire(input, 'input');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return 'needs-you';
    }
    case 'listbox': {
      // Workday-style button that opens a list
      const prefs = want.choice ?? (want.text ? [want.text] : []);
      if (!prefs.length) return 'needs-you';
      pointerClick(el);
      const opts = await waitFor(() => { const o = visibleOptions(el); return o.length ? o : null; }, 2000, wait);
      if (!opts) return 'needs-you';
      const i = bestOption(opts.map((o) => o.textContent ?? ''), prefs);
      if (i < 0) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'needs-you'; }
      pointerClick(opts[i]);
      await wait(150);
      return 'filled';
    }
  }
}

/** Workday: add "Work Experience"/"Education" entries until there is one per profile entry. */
async function ensureBlocks(p: Profile, wait = sleep) {
  for (const [type, count] of [['work', p.work.length], ['edu', p.education.length]] as const) {
    const sectionSel = type === 'work' ? '[data-automation-id="workExperienceSection"]' : '[data-automation-id="educationSection"]';
    const blockSel = type === 'work' ? '[data-automation-id^="workExperience-"]' : '[data-automation-id^="education-"]';
    const section = document.querySelector(sectionSel);
    if (!section) continue;
    for (let guard = 0; guard < 10 && section.querySelectorAll(blockSel).length < Math.min(count, 10); guard++) {
      const add = [...section.querySelectorAll<HTMLElement>('button')].find((b) => /^\s*add(\s+another)?\s*$/i.test(b.textContent ?? '') || b.getAttribute('data-automation-id') === 'Add');
      if (!add) break;
      const before = section.querySelectorAll(blockSel).length;
      safeClick(add);
      await waitFor(() => section.querySelectorAll(blockSel).length > before || null, 2000, wait);
    }
  }
}

/** Workday month/year segments inside a date field container. */
function fillWorkdayDates(p: Profile): FillResult[] {
  const res: FillResult[] = [];
  document.querySelectorAll('[data-automation-id^="workExperience-"], [data-automation-id^="education-"]').forEach((block) => {
    const isWork = block.getAttribute('data-automation-id')!.startsWith('work');
    const idx = Math.max(0, (Number(block.getAttribute('data-automation-id')!.split('-')[1]) || 1) - 1);
    const entry = isWork ? p.work[idx] : p.education[idx];
    if (!entry) return;
    for (const [sel, value] of [['[data-automation-id="formField-startDate"]', entry.start], ['[data-automation-id="formField-endDate"]', isWork && (entry as Profile['work'][number]).current ? '' : entry.end]] as const) {
      const box = block.querySelector(sel);
      if (!box || !value) continue;
      const [y, m] = value.split('-');
      const mi = box.querySelector<HTMLInputElement>('[data-automation-id="dateSectionMonth-input"]');
      const yi = box.querySelector<HTMLInputElement>('[data-automation-id="dateSectionYear-input"]');
      if (mi && m) typeInto(mi, m);
      if (yi && y) typeInto(yi, y);
    }
  });
  return res;
}

export async function fillPage(o: FillOptions): Promise<FillResult[]> {
  const wait = o.wait ?? sleep;
  await ensureBlocks(o.profile, wait);
  const results: FillResult[] = [];
  for (const f of collectFields()) {
    if (/dateSection(Month|Year|Day)-input/.test(f.automationId)) continue; // handled per block below
    const key = keyOf(f);
    const filledAlready = !!currentValue(f);
    if (filledAlready && o.onlyEmpty !== false) { results.push({ field: f, key, status: 'skipped', note: 'already filled' }); continue; }
    let want = key ? wantFor(key, o.profile, f.block ? { [f.block.type]: f.block.index } : {}) : null;
    let fromBank = false;
    if (!want && (f.kind === 'textarea' || f.kind === 'text') && f.label.length > 12) {
      const a = findAnswer(o.answers, f.label);
      if (a) { want = { text: a.answer }; fromBank = true; }
    }
    if (!want) { results.push({ field: f, key, status: key === 'acceptTerms' ? 'needs-you' : f.required ? 'needs-you' : 'skipped', note: key === 'acceptTerms' ? 'Consent is yours to give' : undefined }); continue; }
    let status: Status;
    try {
      status = await fillOne(f, want, o.files, wait);
    } catch (e) {
      status = 'needs-you';
      results.push({ field: f, key, status, note: (e as Error).message });
      continue;
    }
    if (status === 'filled' && (fromBank || !key)) status = 'check';
    results.push({ field: f, key, status, note: fromBank ? 'From your Answer Bank' : undefined });
  }
  results.push(...fillWorkdayDates(o.profile));
  return results;
}
