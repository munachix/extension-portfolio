/**
 * Content script: finds the company name on job pages and search results,
 * asks the background which registers list it, and shows badges.
 * Reads only what's on screen; never clicks or submits anything.
 */
import { adapterFor, watchPage } from '@ext/job-sites';
import type { Result } from '../countries';
import type { Settings } from '../settings';
import { renderBadges } from './badges';

declare global { interface Window { __vfLoaded?: boolean } }

const HOST = 'data-vf-badge';
const HIDDEN = 'data-vf-hidden';
const cache = new Map<string, Result[]>();
let ctx: { pro: boolean; settings: Settings } | null = null;

async function resolve(names: string[]): Promise<void> {
  const missing = [...new Set(names)].filter((n) => n && !cache.has(n));
  if (!missing.length && ctx) return;
  const r = await chrome.runtime.sendMessage({ type: 'vf:lookup', names: missing });
  if (!r || r.error) return;
  ctx = { pro: r.pro, settings: r.settings };
  for (const [n, res] of Object.entries(r.results as Record<string, Result[]>)) cache.set(n, res);
}

function place(after: Element, company: string, compact: boolean): void {
  const results = cache.get(company);
  if (!results || !ctx) return;
  let host = after.nextElementSibling as HTMLElement | null;
  if (!host?.hasAttribute(HOST)) {
    host = document.createElement('span');
    host.setAttribute(HOST, '');
    host.setAttribute('data-x-ext-ui', '');
    after.insertAdjacentElement('afterend', host);
  }
  const sig = `${company}|${results.map((r) => r.cc + r.status).join(',')}|${ctx.pro}`;
  if (host.getAttribute('data-sig') === sig) return;
  host.setAttribute('data-sig', sig);
  renderBadges(host, company, results, {
    compact, pro: ctx.pro,
    onSave: () => chrome.storage.local.get('saved').then(({ saved = [] }) => chrome.storage.local.set({ saved: [{ name: company, results: results.map((x) => `${x.cc.toUpperCase()}: ${x.label}`).join('; '), savedAt: new Date().toISOString(), url: location.href }, ...(saved as { name: string }[]).filter((x) => x.name !== company)] })),
    onSettings: () => chrome.runtime.sendMessage({ type: 'vf:openOptions' }),
  });
}

async function main() {
  const adapter = adapterFor(new URL(location.href));
  if (!adapter) return;
  const run = async () => {
    const job = adapter.readJob(document);
    const items = adapter.listItems?.(document) ?? [];
    const names = [job?.companyText ?? '', ...items.map((i) => i.companyText)].filter(Boolean);
    if (!names.length) return;
    await resolve(names);
    if (!ctx) return;
    if (job?.companyEl && job.companyText) place(job.companyEl, job.companyText, false);
    const showList = ctx.settings.listBadges;
    for (const it of items) {
      if (!it.companyEl || !it.companyText) continue;
      if (showList) place(it.companyEl, it.companyText, true);
      const res = cache.get(it.companyText) ?? [];
      const hide = ctx.pro && ctx.settings.hideNonSponsors && res.length > 0 && res.every((r) => r.status === 'no');
      const el = it.el as HTMLElement;
      if (hide && !el.hasAttribute(HIDDEN)) { el.setAttribute(HIDDEN, el.style.display); el.style.display = 'none'; }
      else if (!hide && el.hasAttribute(HIDDEN)) { el.style.display = el.getAttribute(HIDDEN) ?? ''; el.removeAttribute(HIDDEN); }
    }
  };
  watchPage(() => void run());
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'local' && (c.settings || c.license || c.sync)) {
      cache.clear(); ctx = null;
      document.querySelectorAll(`[${HOST}]`).forEach((h) => h.removeAttribute('data-sig'));
      void run();
    }
  });
}

if (!window.__vfLoaded) { window.__vfLoaded = true; void main(); }
