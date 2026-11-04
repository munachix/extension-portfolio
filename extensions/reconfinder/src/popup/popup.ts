import { downloadText, isPro, toCsv } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import { findCauses, parsePasted, toCents } from '../engine';
import { LICENSE, PRICE, PRO_FEATURES, PRODUCT } from '../settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
async function init() {
  const pro = await isPro();
  document.querySelectorAll<HTMLElement>('.pro-only').forEach((e) => e.classList.toggle('x-locked', !pro));
  let last: ReturnType<typeof findCauses> = [];
  $('find').addEventListener('click', () => {
    const txs = parsePasted(($('paste') as HTMLTextAreaElement).value);
    const diff = toCents(($('diff') as HTMLInputElement).value);
    const out = $('out');
    if (diff == null || !txs.length) { out.textContent = 'Paste at least one amount and the difference.'; return; }
    last = findCauses(txs, diff, { combos: true });
    out.replaceChildren(...(last.length ? last : []).map((s) => { const d = document.createElement('div'); d.className = 'x-card'; const b = document.createElement('strong'); b.textContent = s.title; const p = document.createElement('div'); p.className = 'x-muted'; p.textContent = s.detail; d.append(b, p); return d; }));
    if (!last.length) out.textContent = 'Balanced.';
    ($('csv') as HTMLButtonElement).hidden = !last.length;
  });
  $('csv').addEventListener('click', () => downloadText('reconfinder-candidates.csv', toCsv(last.map((s) => ({ kind: s.kind, suggestion: s.title, detail: s.detail })), ['kind', 'suggestion', 'detail'])));
  await renderPaywall($('pro'), { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, onChange: () => location.reload() });
}
void init();
