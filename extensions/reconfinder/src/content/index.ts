/** ReconFinder on QuickBooks Online. Read-only: never ticks, edits or saves anything. */
import { isPro } from '@ext/core';
import { watchPage } from '@ext/job-sites';
import { findCauses, fmt, type Suggestion } from '../engine';
import { isReconcilePage, readDifference, readRows, tabTitle, type Row } from '../qbo';

declare global { interface Window { __rfLoaded?: boolean } }
const MARK = 'data-rf-suspect';
const CSS = `:host{all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483646;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color-scheme:light}
.box{width:360px;max-width:calc(100vw - 32px);max-height:60vh;overflow:auto;background:#fff;color:#16191d;border:1px solid #dcdbd5;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:10px 12px}
.hd{display:flex;gap:6px;align-items:center;font-weight:700}.hd span{flex:1}button{all:unset;cursor:pointer}.x{color:#777;font-size:16px;padding:0 4px}
.diff{margin:6px 0;font-size:15px}.ok{color:#0d7a3e;font-weight:700}.s{border:1px solid #e6e5df;border-radius:8px;padding:7px 8px;margin:6px 0;cursor:pointer}.s:hover{background:#f6f7f9}
.s b{display:block}.s .d{color:#555;font-size:12px}.pro{font-size:10px;font-weight:700;background:#2457d6;color:#fff;padding:1px 5px;border-radius:4px}.mut{color:#666;font-size:11.5px;margin-top:6px}
.btn{border:1px solid #dcdbd5;border-radius:6px;padding:4px 8px;font-weight:600;margin-right:6px}`;

let host: HTMLElement | null = null;
let collapsed = false;
const el = <K extends keyof HTMLElementTagNameMap>(t: K, p: Record<string, unknown> = {}, ...k: (Node | string)[]) => { const n = Object.assign(document.createElement(t), p) as HTMLElementTagNameMap[K]; n.append(...k); return n; };

function style() {
  if (document.querySelector('style[data-rf-style]')) return;
  const s = el('style', { textContent: `[${MARK}]{outline:2px solid #e0a100 !important;outline-offset:-2px;background:rgba(255,200,0,.12) !important}[${MARK}="focus"]{outline-color:#d03b3b !important}` });
  s.setAttribute('data-rf-style', '');
  s.setAttribute('data-x-ext-ui', '');
  document.head.appendChild(s);
}

function render(diff: number | null, rows: Row[], sugg: Suggestion[], pro: boolean, rerun: () => void) {
  if (!host?.isConnected) {
    host = el('div');
    host.setAttribute('data-rf-ui', '');
    host.setAttribute('data-x-ext-ui', '');
    host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);
  }
  const r = host.shadowRoot!;
  r.replaceChildren(el('style', { textContent: CSS }));
  const tog = el('button', { className: 'x', textContent: collapsed ? '▴' : '–' });
  tog.addEventListener('click', () => { collapsed = !collapsed; render(diff, rows, sugg, pro, rerun); });
  const box = el('div', { className: 'box' }, el('div', { className: 'hd' }, el('span', { textContent: 'ReconFinder' }), tog));
  r.append(box);
  if (collapsed) return;
  if (diff == null) { box.append(el('div', { className: 'mut', textContent: 'Couldn’t read the Difference on this screen. Use paste mode in the ReconFinder popup.' })); return; }
  box.append(el('div', { className: 'diff' }, 'Difference ', el('b', { textContent: fmt(diff) }), ` · ${rows.length} transactions on screen`));
  if (diff === 0) { box.append(el('div', { className: 'ok', textContent: '✓ Balanced. Nothing to find.' })); return; }
  const byId = new Map(rows.map((x) => [x.tx.id, x.el]));
  for (const s of sugg) {
    const card = el('div', { className: 's', role: 'button', tabIndex: 0 }, el('b', { textContent: s.title }), el('div', { className: 'd', textContent: s.detail }));
    card.addEventListener('click', () => {
      document.querySelectorAll(`[${MARK}="focus"]`).forEach((e) => e.setAttribute(MARK, ''));
      const els = s.actions.map((a) => byId.get(a.id)).filter(Boolean) as HTMLElement[];
      els.forEach((e) => e.setAttribute(MARK, 'focus'));
      els[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    box.append(card);
  }
  const act = el('div', {});
  const again = el('button', { className: 'btn', textContent: 'Check again' });
  again.addEventListener('click', rerun);
  act.append(again);
  if (!pro) act.append(el('span', { className: 'mut' }, el('span', { className: 'pro', textContent: 'PRO' }), ' finds combinations of 2–3 transactions'));
  box.append(act, el('div', { className: 'mut', textContent: 'ReconFinder never ticks or edits anything. Not affiliated with Intuit.' }));
}

async function main() {
  let lastKey = '';
  const run = async (force = false) => {
    const t = tabTitle(document);
    if (t && document.title !== t) document.title = t;
    if (!isReconcilePage(new URL(location.href))) { host?.remove(); host = null; document.querySelectorAll(`[${MARK}]`).forEach((e) => e.removeAttribute(MARK)); return; }
    const diff = readDifference(document);
    const rows = readRows(document);
    const key = `${diff}|${rows.map((x) => `${x.tx.amount}${x.tx.cleared ? 1 : 0}`).join(',')}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    const pro = await isPro();
    const sugg = diff ? findCauses(rows.map((x) => x.tx), diff, { combos: pro }) : [];
    style();
    document.querySelectorAll(`[${MARK}]`).forEach((e) => e.removeAttribute(MARK));
    const byId = new Map(rows.map((x) => [x.tx.id, x.el]));
    for (const s of sugg.filter((x) => x.score >= 85)) for (const a of s.actions) byId.get(a.id)?.setAttribute(MARK, '');
    render(diff, rows, sugg, pro, () => void run(true));
  };
  watchPage(() => void run(), { debounceMs: 500 });
  chrome.storage.onChanged.addListener((c) => { if (c.license) void run(true); });
}

if (!window.__rfLoaded) { window.__rfLoaded = true; void main(); }
