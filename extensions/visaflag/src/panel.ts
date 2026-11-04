/** Shared UI for the popup and the options page. */
import { downloadText, isPro, toCsv } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import { ALL, INFO, type CC, type Result } from './countries';
import type { SyncInfo } from './data';
import { LICENSE, PRICE, PRO_FEATURES, PRODUCT, loadSettings, saveSettings, saved } from './settings';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) => {
  const n = Object.assign(document.createElement(tag), props) as HTMLElementTagNameMap[K];
  n.append(...kids);
  return n;
};
const fmtDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : s ?? '');

export async function mountPanel(root: HTMLElement, { full = false } = {}) {
  const render = async () => {
    const pro = await isPro();
    const s = await loadSettings();
    const { sync = {} } = (await chrome.storage.local.get('sync')) as { sync?: Partial<Record<CC, SyncInfo>> };
    root.replaceChildren();

    // Countries
    const countries = el('section', { className: 'x-card' }, el('h2', { textContent: pro ? 'Countries to check' : 'Country to check' }));
    for (const cc of ALL) {
      const input = el('input', { type: pro ? 'checkbox' : 'radio', name: 'cc', value: cc, checked: pro ? s.countries.includes(cc) : s.countries[0] === cc });
      input.addEventListener('change', async () => {
        const chosen = pro ? ALL.filter((c) => (root.querySelector<HTMLInputElement>(`input[value="${c}"]`)!).checked) : [cc];
        await saveSettings({ countries: chosen.length ? chosen : [cc] });
        await render();
      });
      const info = sync[cc];
      const status = info?.updated ? `${info.count?.toLocaleString()} employers · updated ${fmtDate(info.updated)}${info.stale ? ' (source down, showing last good data)' : ''}` : info?.error ?? (s.countries.includes(cc) ? 'Downloading…' : '');
      countries.append(el('label', { className: 'x-check' }, input, `${INFO[cc].flag} ${INFO[cc].name}`), el('div', { className: 'x-muted', style: 'margin:-6px 0 6px 24px' }, status));
    }
    if (!pro) countries.append(el('p', { className: 'x-muted', textContent: 'Free checks one country. Pro checks all four at once.' }));
    const refresh = el('button', { type: 'button', textContent: 'Check for new data' });
    refresh.addEventListener('click', async () => { refresh.disabled = true; refresh.textContent = 'Checking…'; await chrome.runtime.sendMessage({ type: 'vf:sync', force: false }); await render(); });
    countries.append(refresh);
    root.append(countries);

    // Search (Pro)
    const search = el('section', { className: 'x-card' }, el('h2', { textContent: 'Check any company' }));
    const q = el('input', { type: 'text', placeholder: 'Company name, e.g. Monzo', disabled: !pro });
    const out = el('div', { role: 'status' });
    const go = el('button', { type: 'button', className: 'primary', textContent: 'Check', disabled: !pro });
    const doSearch = async () => {
      if (!q.value.trim()) return;
      const r = await chrome.runtime.sendMessage({ type: 'vf:lookup', names: [q.value.trim()] });
      const res = (r?.results?.[q.value.trim()] ?? []) as Result[];
      out.replaceChildren(...res.map((x) => el('p', {}, el('strong', { textContent: `${INFO[x.cc].flag} ${x.label}` }), x.official ? el('br') : '', x.official ? `“${x.official}”` : '', x.details.length ? el('br') : '', x.details.join(' · '))));
      if (pro && res.some((x) => x.status === 'yes' || x.status === 'likely')) {
        const sv = el('button', { type: 'button', textContent: '☆ Save' });
        sv.addEventListener('click', async () => { await saved.add({ name: q.value.trim(), results: res.map((x) => `${x.cc.toUpperCase()}: ${x.label}`).join('; '), savedAt: new Date().toISOString(), url: '' }); sv.textContent = '★ Saved'; void renderSaved(); });
        out.append(sv);
      }
    };
    go.addEventListener('click', doSearch);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doSearch(); });
    search.append(el('div', { className: 'x-row' }, q, go), out);
    if (!pro) search.append(el('p', { className: 'x-muted', textContent: 'Searching any company is a Pro feature.' }));
    root.append(search);

    // Saved (Pro)
    const savedBox = el('section', {});
    const renderSaved = async () => {
      savedBox.replaceChildren();
      if (!pro) return;
      const list = await saved.list();
      savedBox.className = 'x-card';
      savedBox.append(el('h2', { textContent: `Saved companies (${list.length})` }));
      for (const c of list.slice(0, full ? 50 : 5)) savedBox.append(el('div', { className: 'x-muted' }, el('strong', { textContent: c.name }), ` · ${c.results}`));
      if (list.length) {
        const b = el('button', { type: 'button', textContent: 'Export to CSV' });
        b.addEventListener('click', () => downloadText('visaflag-saved-companies.csv', toCsv(list as unknown as Record<string, unknown>[], ['name', 'results', 'url', 'savedAt'])));
        savedBox.append(b);
      }
    };
    await renderSaved();
    root.append(savedBox);

    // Pro list settings
    if (full) {
      const opts = el('section', { className: `x-card${pro ? '' : ' x-locked'}` }, el('h2', { textContent: 'Search results (Pro)' }));
      for (const [key, label] of [['listBadges', 'Show badges on search-result lists'], ['hideNonSponsors', 'Hide companies that don’t sponsor in any chosen country']] as const) {
        const c = el('input', { type: 'checkbox', checked: s[key] });
        c.addEventListener('change', () => saveSettings({ [key]: c.checked }));
        opts.append(el('label', { className: 'x-check' }, c, label));
      }
      root.append(opts);
    }

    const pay = el('section', {});
    root.append(pay);
    await renderPaywall(pay, { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, onChange: () => void render() });
    root.append(el('p', { className: 'x-muted', textContent: 'Data: official government registers (GOV.UK, US Dept. of Labor, Government of Canada, IND). Being licensed to sponsor doesn’t mean a company will sponsor a specific job. Always confirm with the employer. Not legal advice.' }));
  };
  await render();
  chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c.sync) void render(); });
}
