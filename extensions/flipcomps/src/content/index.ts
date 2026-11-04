/** FlipComps on listing and sold pages. Read-only: never lists, relists, shares or messages. */
import { isPro } from '@ext/core';
import { watchPage } from '@ext/job-sites';
import { outcome, PLATFORMS, priceForProfit, type Platform } from '../fees';
import { isSoldPage, platformOf, queryFromTitle, readListing, readSoldPrices, soldSearchUrls } from '../page';
import { summarize, type Stats } from '../stats';
import { fees, FREE_SOLD_PER_DAY, inventory, prefs, useSoldSummary } from '../settings';

declare global { interface Window { __fcLoaded?: boolean } }

const CSS = `:host{all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483646;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color-scheme:light}
.box{width:320px;max-width:calc(100vw - 32px);background:#fff;color:#16191d;border:1px solid #dcdbd5;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:10px 12px}
.hd{display:flex;align-items:center;gap:6px;font-weight:700}.hd span{flex:1}button{all:unset;cursor:pointer}
.x{color:#777;font-size:16px;padding:0 4px}.t{color:#444;margin:4px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.links{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.links a{background:#eef4ff;color:#1d4fb8;text-decoration:none;padding:3px 8px;border-radius:999px;font-weight:600;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:6px;font-variant-numeric:tabular-nums}th,td{text-align:right;padding:3px 2px;border-bottom:1px solid #eee}th:first-child,td:first-child{text-align:left}th{color:#666;font-weight:600;font-size:11.5px}
.best td{font-weight:700}.neg{color:#b42318}.in{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px}.in label{font-size:11px;color:#666}
.in input{all:unset;box-sizing:border-box;width:100%;border:1px solid #ccc;border-radius:6px;padding:3px 6px;background:#fff;color:#16191d}
.stats{background:#f6f7f9;border-radius:8px;padding:8px;margin-top:6px}.stats b{font-size:15px}.pro{font-size:10px;font-weight:700;background:#2457d6;color:#fff;padding:1px 5px;border-radius:4px}
.act{display:flex;gap:8px;margin-top:8px}.act button{border:1px solid #dcdbd5;border-radius:6px;padding:4px 8px;font-weight:600}.mut{color:#666;font-size:11.5px;margin-top:6px}`;

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
let host: HTMLElement | null = null;
let collapsed = false;

function root(): ShadowRoot {
  if (host?.isConnected) return host.shadowRoot!;
  host = document.createElement('div');
  host.setAttribute('data-fc-ui', '');
  host.setAttribute('data-x-ext-ui', '');
  host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);
  return host.shadowRoot!;
}
const el = <K extends keyof HTMLElementTagNameMap>(t: K, p: Record<string, unknown> = {}, ...k: (Node | string)[]) => { const n = Object.assign(document.createElement(t), p) as HTMLElementTagNameMap[K]; n.append(...k); return n; };

async function renderListing(platform: Platform, title: string, price: number | null) {
  const [pro, pr, table] = await Promise.all([isPro(), prefs.get(), fees.get()]);
  const r = root();
  r.replaceChildren(el('style', { textContent: CSS }));
  const box = el('div', { className: 'box' });
  const close = el('button', { className: 'x', textContent: collapsed ? '▴' : '–', title: 'Collapse' });
  close.addEventListener('click', () => { collapsed = !collapsed; void renderListing(platform, title, price); });
  box.append(el('div', { className: 'hd' }, el('span', { textContent: 'FlipComps' }), close));
  r.append(box);
  if (collapsed) return;
  box.append(el('div', { className: 't', title, textContent: title || 'This item' }));
  const q = queryFromTitle(title);
  box.append(el('div', { className: 'links' }, ...soldSearchUrls(q).map((l) => el('a', { href: l.url, target: '_blank', rel: 'noopener', textContent: `${l.label} ↗` }))));

  const priceIn = el('input', { type: 'number', step: '0.01', value: String(price ?? ''), 'aria-label': 'Sale price' });
  const costIn = el('input', { type: 'number', step: '0.01', value: String(pr.cost || ''), placeholder: '0', 'aria-label': 'Your cost' });
  const shipIn = el('input', { type: 'number', step: '0.01', value: String(pr.shipCost), 'aria-label': 'Your shipping cost' });
  box.append(el('div', { className: 'in' }, el('div', {}, el('label', { textContent: 'Sell price' }), priceIn), el('div', {}, el('label', { textContent: 'Your cost' }), costIn), el('div', {}, el('label', { textContent: 'You pay shipping' }), shipIn)));
  const tbl = el('table');
  const draw = () => {
    const s = { price: Number(priceIn.value) || 0, buyerShipping: pr.buyerShipping, shipCost: Number(shipIn.value) || 0, cost: Number(costIn.value) || 0, ebayCategory: pr.ebayCategory, depopBoosted: pr.depopBoosted };
    const rows = PLATFORMS.map((p) => outcome(p, s, table));
    const best = Math.max(...rows.map((o) => o.profit));
    tbl.replaceChildren(el('tr', {}, ...['Platform', 'Fees', 'You keep', pro ? `For ${money(pr.target)}` : 'Profit'].map((h) => el('th', { textContent: h }))),
      ...rows.map((o) => el('tr', { className: o.profit === best && s.price ? 'best' : '' }, el('td', { textContent: o.name }), el('td', { textContent: money(o.fee) }), el('td', { textContent: money(o.profit), className: o.profit < 0 ? 'neg' : '' }),
        el('td', { textContent: pro ? money(priceForProfit(o.platform, pr.target, s, table)) : '' }))));
    if (!pro) tbl.querySelectorAll('tr').forEach((tr, i) => { if (i === 0) (tr.lastChild as HTMLElement).textContent = ''; });
  };
  for (const i of [priceIn, costIn, shipIn]) i.addEventListener('input', () => { draw(); void prefs.set({ cost: Number(costIn.value) || 0, shipCost: Number(shipIn.value) || 0 }); });
  draw();
  box.append(tbl);
  const act = el('div', { className: 'act' });
  if (pro) {
    const save = el('button', { textContent: '☆ Save to inventory' });
    save.addEventListener('click', async () => { await inventory.add({ title, url: location.href, platform, cost: Number(costIn.value) || 0, price: Number(priceIn.value) || 0, savedAt: new Date().toISOString() }); save.textContent = '★ Saved'; });
    act.append(save);
  } else act.append(el('span', { className: 'mut' }, el('span', { className: 'pro', textContent: 'PRO' }), ' Price for your target profit, unlimited sold summaries & inventory log'));
  box.append(act, el('div', { className: 'mut', textContent: 'US fees. Not affiliated with eBay, Poshmark, Mercari, Depop or Etsy.' }));
}

async function renderSold(platform: Platform, stats: Stats | null, query: string) {
  const pro = await isPro();
  const allowance = pro || !stats ? { ok: true, left: Infinity } : await useSoldSummary(query);
  const r = root();
  r.replaceChildren(el('style', { textContent: CSS }));
  const box = el('div', { className: 'box' }, el('div', { className: 'hd' }, el('span', { textContent: 'FlipComps · sold on this page' })));
  if (!stats) box.append(el('div', { className: 'mut', textContent: 'No sold prices found on this page yet. Scroll or change filters.' }));
  else if (!allowance.ok) box.append(el('div', { className: 'stats' }, el('b', { textContent: `${stats.count} sold items` }), el('div', { className: 'mut' }, `You’ve used today’s ${FREE_SOLD_PER_DAY} free summaries (searches you already opened today still work). `, el('span', { className: 'pro', textContent: 'PRO' }), ' Unlimited, from the FlipComps menu.')));
  else box.append(el('div', { className: 'stats' }, el('div', {}, 'Median ', el('b', { textContent: money(stats.median) })), el('div', { textContent: `Typical: ${money(stats.p25)} – ${money(stats.p75)} · range ${money(stats.low)} – ${money(stats.high)}` }), el('div', { className: 'mut', textContent: `${stats.used} of ${stats.count} sold items used (${stats.count - stats.used} outliers removed). Prices shown on this page only.` }), pro ? '' : el('div', { className: 'mut', textContent: `Free: ${allowance.left} more new searches today.` })));
  r.append(box);
}

async function main() {
  const platform = platformOf(location.hostname);
  if (!platform) return;
  let last = '';
  watchPage(() => {
    const url = new URL(location.href);
    if (isSoldPage(url)) {
      const prices = readSoldPrices(document, platform);
      const key = `sold|${url.href}|${prices.length}`;
      if (key !== last) { last = key; void renderSold(platform, summarize(prices), url.searchParams.get('_nkw') ?? url.searchParams.get('keyword') ?? url.searchParams.get('query') ?? url.searchParams.get('q') ?? url.pathname); }
      return;
    }
    const l = readListing(document, url);
    if (!l) { if (host) { host.remove(); host = null; } last = ''; return; }
    const key = `${url.href}|${l.title}|${l.price}`;
    if (key !== last) { last = key; void renderListing(l.platform, l.title, l.price); }
  }, { debounceMs: 400 });
  // Re-render when the license or fees change (not on the panel's own input, which would steal focus)
  chrome.storage.onChanged.addListener((c) => { if (c.license || c.fees) last = ''; });
}

if (!window.__fcLoaded) { window.__fcLoaded = true; void main(); }
