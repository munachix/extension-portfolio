/**
 * Finds the fillable fields on an application page and works out what each one
 * asks ("label"), including radio/checkbox groups and custom dropdowns.
 */
export type Kind = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'checkboxGroup' | 'combobox' | 'listbox' | 'file' | 'date' | 'month';

export interface Field {
  kind: Kind;
  el: HTMLElement;
  /** Radio/checkbox group members. */
  group?: HTMLInputElement[];
  /** The question text. */
  label: string;
  /** name/id/automation-id etc., also used for classification. */
  hint: string;
  automationId: string;
  required: boolean;
  /** Option labels (select, radio/checkbox groups). */
  options?: string[];
  /** Repeated work/education block this field sits in. */
  block?: { type: 'work' | 'edu'; index: number; el: Element };
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/[\s ]+/g, ' ').replace(/\s*\*\s*$/, '').trim();
const textOf = (el: Element | null) => clean(el?.textContent);

function byIds(ids: string | null, root: Document | ShadowRoot): string {
  return (ids ?? '').split(/\s+/).filter(Boolean).map((id) => textOf(root.getElementById?.(id) ?? document.getElementById(id))).join(' ');
}

/** The question an element asks, from the most to the least reliable source. */
export function labelFor(el: HTMLElement): string {
  const doc = el.ownerDocument;
  const id = el.id;
  if (id) {
    const l = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (l && textOf(l)) return textOf(l);
  }
  const lb = byIds(el.getAttribute('aria-labelledby'), doc);
  if (lb) return lb;
  const al = el.getAttribute('aria-label');
  if (al) return clean(al);
  const wrap = el.closest('label');
  if (wrap && textOf(wrap)) return textOf(wrap);
  // Workday: formField container with a label
  const wd = el.closest('[data-automation-id^="formField-"]');
  if (wd) { const t = textOf(wd.querySelector('label, legend')); if (t) return t; }
  // Lever: li.application-question > .application-label
  const lv = el.closest('li.application-question, .application-question, .custom-question');
  if (lv) { const t = textOf(lv.querySelector('.application-label, .text, label')); if (t) return t; }
  const fs = el.closest('fieldset');
  if (fs) { const t = textOf(fs.querySelector('legend')); if (t) return t; }
  const ph = el.getAttribute('placeholder');
  if (ph) return clean(ph);
  // nearest preceding text in the same container
  let p: Element | null = el.parentElement;
  for (let i = 0; p && i < 3; i++, p = p.parentElement) {
    const t = textOf(p).replace(textOf(el), '').trim();
    if (t && t.length < 200) return t;
  }
  return '';
}

/** Question text for a group of radios/checkboxes sharing a name. */
function groupLabel(first: HTMLInputElement): string {
  const fs = first.closest('fieldset');
  if (fs) { const t = textOf(fs.querySelector('legend')); if (t) return t; }
  const rg = first.closest('[role="radiogroup"], [role="group"]');
  if (rg) { const t = clean(rg.getAttribute('aria-label')) || byIds(rg.getAttribute('aria-labelledby'), first.ownerDocument); if (t) return t; }
  const lv = first.closest('li.application-question, .application-question, [data-automation-id^="formField-"]');
  if (lv) { const t = textOf(lv.querySelector('.application-label, label:not(:has(input)), legend, .text')); if (t) return t; }
  return labelFor(first.parentElement as HTMLElement);
}

const optionLabel = (i: HTMLInputElement) => clean(i.closest('label')?.textContent) || (i.id ? textOf(i.ownerDocument.querySelector(`label[for="${CSS.escape(i.id)}"]`)) : '') || i.value;

function visible(el: HTMLElement): boolean {
  if ((el as HTMLInputElement).type === 'file') return true; // file inputs are usually hidden behind a button
  const st = getComputedStyle(el);
  if (st.display === 'none' || st.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0 || el.getClientRects().length > 0;
}

export function blockOf(el: Element): Field['block'] {
  const wd = el.closest('[data-automation-id^="workExperience-"], [data-automation-id^="education-"]');
  if (wd) {
    const a = wd.getAttribute('data-automation-id')!;
    return { type: a.startsWith('work') ? 'work' : 'edu', index: Math.max(0, (Number(a.split('-')[1]) || 1) - 1), el: wd };
  }
  return undefined;
}

export function collectFields(root: ParentNode = document): Field[] {
  const out: Field[] = [];
  const seenGroups = new Set<string>();
  const els = root.querySelectorAll<HTMLElement>('input, select, textarea, button[aria-haspopup="listbox"], [role="combobox"]:not(input)');
  for (const el of els) {
    if (el.closest('[data-x-ext-ui]')) continue;
    const tag = el.tagName;
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? '';
    if (tag === 'INPUT' && ['hidden', 'submit', 'button', 'image', 'reset', 'search', 'password'].includes(type)) continue;
    if ((el as HTMLInputElement).disabled || (el as HTMLInputElement).readOnly && type !== 'file' && el.getAttribute('role') !== 'combobox') continue;
    // Hidden helper inputs (react-select's "requiredInput", honeypots): not for people, so not for us.
    if (el.getAttribute('aria-hidden') === 'true' && el.tabIndex < 0 && type !== 'file') continue;
    if (/recaptcha|captcha|honeypot/i.test(`${el.id} ${(el as HTMLInputElement).name ?? ''} ${el.className}`)) continue;
    if (!visible(el)) continue;
    const automationId = el.getAttribute('data-automation-id') ?? el.closest('[data-automation-id]')?.getAttribute('data-automation-id') ?? '';
    const hint = [el.id, (el as HTMLInputElement).name, automationId, el.getAttribute('autocomplete')].filter(Boolean).join(' ');
    const required = (el as HTMLInputElement).required || el.getAttribute('aria-required') === 'true';
    const base = { el, hint, automationId, required, block: blockOf(el) };

    if (tag === 'INPUT' && (type === 'radio' || type === 'checkbox')) {
      const name = (el as HTMLInputElement).name;
      const form = (el as HTMLInputElement).form ?? el.ownerDocument;
      const group = name ? [...form.querySelectorAll<HTMLInputElement>(`input[type="${type}"][name="${CSS.escape(name)}"]`)] : [el as HTMLInputElement];
      if (name && seenGroups.has(`${type}:${name}`)) continue;
      if (name) seenGroups.add(`${type}:${name}`);
      if (group.length > 1) {
        out.push({ ...base, kind: type === 'radio' ? 'radio' : 'checkboxGroup', group, label: groupLabel(group[0]), options: group.map(optionLabel) });
      } else {
        out.push({ ...base, kind: 'checkbox', label: optionLabel(el as HTMLInputElement) || labelFor(el) });
      }
      continue;
    }
    if (tag === 'SELECT') {
      out.push({ ...base, kind: 'select', label: labelFor(el), options: [...(el as HTMLSelectElement).options].map((o) => clean(o.textContent)) });
      continue;
    }
    if (tag === 'TEXTAREA') { out.push({ ...base, kind: 'textarea', label: labelFor(el) }); continue; }
    if (tag === 'BUTTON' || (tag !== 'INPUT' && el.getAttribute('role') === 'combobox')) { out.push({ ...base, kind: 'listbox', label: labelFor(el) }); continue; }
    if (type === 'file') { out.push({ ...base, kind: 'file', label: labelFor(el) || clean(el.closest('[class*="upload"], [data-automation-id*="upload"], div')?.textContent) }); continue; }
    if (type === 'date') { out.push({ ...base, kind: 'date', label: labelFor(el) }); continue; }
    if (type === 'month') { out.push({ ...base, kind: 'month', label: labelFor(el) }); continue; }
    if (el.getAttribute('role') === 'combobox' || el.getAttribute('aria-autocomplete') === 'list') { out.push({ ...base, kind: 'combobox', label: labelFor(el) }); continue; }
    out.push({ ...base, kind: 'text', label: labelFor(el) });
  }
  return out;
}
