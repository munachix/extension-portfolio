/** Badges next to company names (shadow DOM, so page CSS can't touch them). */
import { INFO, type Result } from '../countries';

const CSS = `
:host { all: initial; display: inline-flex; gap: 4px; margin-left: 6px; vertical-align: middle; font: 600 12px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; position: relative; }
button.p { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
.yes { background: #e7f6ee; color: #0d6b3c; border-color: #9fd8b8; }
.likely { background: #eef4ff; color: #1d4fb8; border-color: #b4c9f5; }
.no { background: #f3f3f1; color: #5c5b56; border-color: #dcdbd5; }
.nodata { background: #fff6dc; color: #7a5200; border-color: #ecd38a; }
.pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 2147483646; width: 320px; max-width: 80vw; background: #fff; color: #16191d; border: 1px solid #dcdbd5; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.18); padding: 10px 12px; font-weight: 400; font-size: 13px; white-space: normal; }
.pop h4 { margin: 0 0 6px; font-size: 13px; }
.pop .r { margin: 6px 0; }
.pop .k { font-weight: 700; }
.pop .muted { color: #5c5b56; font-size: 12px; }
.pop .act { display: flex; gap: 8px; margin-top: 8px; }
.pop .act button { all: unset; cursor: pointer; padding: 3px 9px; border-radius: 6px; border: 1px solid #dcdbd5; font-weight: 600; font-size: 12px; }
`;
const ICON = { yes: '✓', likely: '≈', no: '✕', nodata: '…' } as const;

export interface BadgeOpts { compact?: boolean; pro: boolean; onSave?: () => void; onSettings: () => void }

export function renderBadges(host: HTMLElement, company: string, results: Result[], o: BadgeOpts): void {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  root.replaceChildren();
  const style = document.createElement('style');
  style.textContent = CSS;
  root.append(style);
  for (const r of results) {
    const b = document.createElement('button');
    b.className = `p ${r.status}`;
    b.title = `${r.label}${r.official ? ` — registered as “${r.official}”` : ''}`;
    b.textContent = `${INFO[r.cc].flag} ${ICON[r.status]}${o.compact ? '' : ` ${r.status === 'no' ? 'Not listed' : r.status === 'nodata' ? 'No data' : r.status === 'likely' ? 'Likely sponsor' : 'Sponsor'}`}`;
    b.setAttribute('aria-label', `${INFO[r.cc].name}: ${b.title}`);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(root, company, results, o); });
    root.append(b);
  }
}

function toggle(root: ShadowRoot, company: string, results: Result[], o: BadgeOpts) {
  const old = root.querySelector('.pop');
  if (old) { old.remove(); return; }
  const pop = document.createElement('div');
  pop.className = 'pop';
  pop.setAttribute('role', 'dialog');
  const h = document.createElement('h4');
  h.textContent = company;
  pop.append(h);
  for (const r of results) {
    const d = document.createElement('div');
    d.className = 'r';
    const k = document.createElement('div');
    k.className = 'k';
    k.textContent = `${INFO[r.cc].flag} ${r.label}`;
    d.append(k);
    if (r.official) { const s = document.createElement('div'); s.className = 'muted'; s.textContent = `Registered as “${r.official}”${r.status === 'likely' ? ' — check it’s the same company' : ''}`; d.append(s); }
    if (r.details.length) { const s = document.createElement('div'); s.textContent = r.details.join(' · '); d.append(s); }
    pop.append(d);
  }
  const disc = document.createElement('p');
  disc.className = 'muted';
  disc.textContent = 'Licensed to sponsor ≠ will sponsor this job. Always confirm with the employer. Not legal advice.';
  pop.append(disc);
  const act = document.createElement('div');
  act.className = 'act';
  if (o.pro && o.onSave) { const s = document.createElement('button'); s.textContent = '☆ Save company'; s.addEventListener('click', () => { o.onSave!(); s.textContent = '★ Saved'; }); act.append(s); }
  const set = document.createElement('button');
  set.textContent = o.pro ? 'Settings' : 'All 4 countries: Pro';
  set.addEventListener('click', o.onSettings);
  act.append(set);
  pop.append(act);
  root.append(pop);
}
