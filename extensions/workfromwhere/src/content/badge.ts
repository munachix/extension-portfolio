/** The badge shown on a job page. Lives in a shadow root so page CSS can't touch it. */
import type { Verdict } from '../engine/detect';
import { countryName } from '../engine/places';
import { localWindow } from '../engine/timezones';
import type { Settings } from '../settings';

const CSS = `
:host { all: initial; display: block; margin: 0 0 12px; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color-scheme: light; }
:host([data-floating]) { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; width: min(380px, calc(100vw - 32px)); margin: 0; }
.b { border-radius: 10px; padding: 10px 12px; border: 1px solid; box-shadow: 0 1px 3px rgba(0,0,0,.08); color: #16191d; }
.s-green { background: #e7f6ee; border-color: #9fd8b8; }
.s-red { background: #fdecec; border-color: #f2b1b1; }
.s-yellow, .s-unset { background: #fff6dc; border-color: #ecd38a; }
.row { display: flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.s-green .dot { background: #12804a; } .s-red .dot { background: #c22d2d; } .s-yellow .dot, .s-unset .dot { background: #c79100; }
.title { font-weight: 700; }
.reason { color: #333; flex: 1; min-width: 0; }
.x { all: unset; cursor: pointer; padding: 0 4px; color: #666; font-size: 16px; line-height: 1; }
.quote { all: unset; display: block; cursor: pointer; margin: 8px 0 0; padding: 6px 8px; background: rgba(255,255,255,.6); border-left: 3px solid currentColor; border-radius: 4px; font-size: 13px; color: #333; }
.quote:hover { background: #fff; }
.tz { margin-top: 6px; font-size: 13px; color: #333; }
.foot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: #555; }
.foot .sp { flex: 1; }
a, .link { all: unset; cursor: pointer; color: #2457d6; text-decoration: underline; }
.btn { all: unset; cursor: pointer; padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,.18); background: #fff; font-size: 12px; font-weight: 600; color: #16191d; }
.pro { font-size: 10px; font-weight: 700; background: #2457d6; color: #fff; padding: 1px 5px; border-radius: 4px; }
.collapsed .quote, .collapsed .tz, .collapsed .foot { display: none; }
`;

const TITLES = { green: 'Open to you', red: 'Restricted', yellow: 'Unclear', unset: 'Set your country' } as const;

export interface BadgeHandlers {
  onQuote(index: number): void;
  onSave?(): void;
  onSettings(): void;
}

const HOST_ATTR = 'data-wfw-badge';
let host: HTMLElement | null = null;
let collapsed = false;

export function badgeAttached(): boolean {
  return !!host && host.isConnected;
}

export function removeBadge(): void {
  host?.remove();
  host = null;
}

export function renderBadge(anchor: Element | null, v: Verdict, s: Settings, pro: boolean, h: BadgeHandlers, saved = false): void {
  if (!host) {
    host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '');
    host.setAttribute('data-x-ext-ui', '');
    host.attachShadow({ mode: 'open' });
  }
  if (anchor?.parentElement) {
    host.removeAttribute('data-floating');
    if (host.nextElementSibling !== anchor) anchor.parentElement.insertBefore(host, anchor);
  } else {
    host.setAttribute('data-floating', '');
    if (!host.isConnected) document.body.appendChild(host);
  }

  const root = host.shadowRoot!;
  root.replaceChildren();
  const style = document.createElement('style');
  style.textContent = CSS;
  const box = document.createElement('div');
  box.className = `b s-${v.status}${collapsed ? ' collapsed' : ''}`;
  box.setAttribute('role', 'status');

  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<span class="dot"></span><span class="title"></span><span class="reason"></span><button class="x" title="Collapse" aria-label="Collapse">${collapsed ? '▾' : '–'}</button>`;
  row.querySelector('.title')!.textContent = TITLES[v.status];
  row.querySelector('.reason')!.textContent = v.status === 'unset' ? '' : v.reason;
  row.querySelector('.x')!.addEventListener('click', () => { collapsed = !collapsed; renderBadge(anchor, v, s, pro, h, saved); });
  box.append(row);

  // Evidence quotes from the description (most important first)
  const quotes = v.evidence
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.start >= 0 && e.effect !== 'neutral' && (v.status !== 'green' || e.effect === 'green') && (v.status !== 'red' || e.effect === 'red'))
    .filter(({ e }, k, all) => all.findIndex((x) => x.e.start === e.start) === k)
    .slice(0, 2);
  for (const { e, i } of quotes) {
    const q = document.createElement('button');
    q.className = 'quote';
    q.title = 'Show in the job post';
    q.textContent = `“${e.text.length > 220 ? `${e.text.slice(0, 217)}…` : e.text}”`;
    q.addEventListener('click', () => h.onQuote(i));
    box.append(q);
  }
  if (!quotes.length && v.status !== 'unset') {
    const side = v.evidence.find((e) => e.start < 0 && e.effect !== 'neutral');
    if (side) {
      const q = document.createElement('div');
      q.className = 'tz';
      q.textContent = side.source === 'structured' ? 'From the job’s posted applicant-location data.' : 'From the job’s location field.';
      box.append(q);
    }
  }

  // Time-zone notes
  for (const tz of v.timezones.slice(0, 2)) {
    const d = document.createElement('div');
    d.className = 'tz';
    const hours = tz.hours ? `${tz.hours[0]}:00–${tz.hours[1]}:00` : 'business hours';
    d.textContent = `⏰ Works ${tz.label} ${hours}${tz.overlapHours ? ` (needs ${tz.overlapHours}h overlap)` : ''} `;
    if (pro && s.timeZone) {
      const w = localWindow(tz, s.timeZone);
      if (w) d.append(`= ${w.from}–${tz.overlapHours ? w.overlapTo : w.to} your time`);
    } else {
      const p = document.createElement('span');
      p.className = 'pro';
      p.textContent = 'PRO';
      p.title = 'See these hours in your time zone with Pro';
      d.append(p);
    }
    box.append(d);
  }

  const foot = document.createElement('div');
  foot.className = 'foot';
  const who = s.country ? `for ${countryName(s.country)}` : 'Choose your country';
  foot.innerHTML = `<span>WorkFromWhere · <span class="who"></span> · <button class="link set">change</button></span><span class="sp"></span>`;
  foot.querySelector('.who')!.textContent = who;
  foot.querySelector('.set')!.addEventListener('click', h.onSettings);
  if (pro && h.onSave && v.status === 'green') {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = saved ? '★ Saved' : '☆ Save job';
    b.addEventListener('click', () => h.onSave!());
    foot.append(b);
  }
  box.append(foot);
  root.append(style, box);
}
