import { downloadText, isPro, markRateUsShown, shouldShowRateUs, storeListingUrl, toCsv } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import cfg from '../../extension.config.json';
import { mountProfileForm } from '../form';
import { LICENSE, PRICE, PRO_FEATURES, PRODUCT, savedJobs } from '../settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const LABEL = { green: '🟢 Open to you', red: '🔴 Restricted', yellow: '🟡 Unclear', unset: '⚪ Set your country' } as Record<string, string>;

async function status() {
  const box = $('status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url ?? '')) { box.textContent = 'Open a job post to check it.'; return; }
  const show = (r: { adapter: string; verdict: { status: string; reason: string } | null } | undefined) => {
    if (!r) return false;
    box.replaceChildren();
    if (!r.verdict) { box.textContent = `No job post found on this page (${r.adapter}).`; return true; }
    const t = document.createElement('strong');
    t.textContent = LABEL[r.verdict.status] ?? r.verdict.status;
    const p = document.createElement('div');
    p.className = 'x-muted';
    p.textContent = r.verdict.reason;
    box.append(t, p);
    return true;
  };
  try {
    if (show(await chrome.tabs.sendMessage(tab.id, { type: 'wfw:status' }))) return;
  } catch { /* no content script on this site */ }
  box.replaceChildren();
  const p = document.createElement('p');
  p.className = 'x-muted';
  p.textContent = 'This site isn’t one we check automatically.';
  const b = document.createElement('button');
  b.className = 'primary';
  b.textContent = 'Check this page';
  b.addEventListener('click', async () => {
    b.disabled = true;
    // activeTab: the user clicked, so we may inject once into this tab.
    await chrome.scripting.executeScript({ target: { tabId: tab.id! }, files: ['content.js'] });
    show(await chrome.tabs.sendMessage(tab.id!, { type: 'wfw:check' }).catch(() => undefined));
  });
  box.append(p, b);
}

async function saved(pro: boolean) {
  const root = $('saved');
  root.replaceChildren();
  if (!pro) return;
  const jobs = await savedJobs.list();
  const h = document.createElement('h3');
  h.textContent = `Saved jobs (${jobs.length})`;
  root.append(h);
  for (const j of jobs.slice(0, 5)) {
    const a = document.createElement('a');
    a.href = j.url;
    a.target = '_blank';
    a.textContent = `${j.title || j.url}${j.company ? ` · ${j.company}` : ''}`;
    a.style.cssText = 'display:block;margin:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    root.append(a);
  }
  if (jobs.length) {
    const b = document.createElement('button');
    b.textContent = 'Export all to CSV';
    b.addEventListener('click', () => downloadText('workfromwhere-saved-jobs.csv', toCsv(jobs as unknown as Record<string, unknown>[], ['title', 'company', 'url', 'status', 'reason', 'savedAt'])));
    root.append(b);
  }
}

async function rateUs() {
  if (!(await shouldShowRateUs())) return;
  const root = $('rate');
  root.hidden = false;
  root.querySelector<HTMLAnchorElement>('a')!.href = storeListingUrl(cfg.storeExtensionId);
  root.querySelector('a')!.addEventListener('click', () => markRateUsShown());
  root.querySelector('button')!.addEventListener('click', async () => { await markRateUsShown(); root.hidden = true; });
}

async function init() {
  await mountProfileForm($('profile'));
  const pro = await isPro();
  await renderPaywall($('pro'), { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, onChange: (p) => void saved(p) });
  await Promise.all([status(), saved(pro), rateUs()]);
  $('options').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
}

void init();
