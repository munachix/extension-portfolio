/** Pro: small colored pill on each search-result card, and optional hiding of restricted ones. */
import type { ListItem } from '@ext/job-sites';
import { detectCard } from '../engine/detect';
import type { Settings } from '../settings';

const MARK = 'data-wfw-card';
const HIDDEN = 'data-wfw-hidden';
const PILL = 'data-wfw-pill';
const COLORS = { green: ['#e7f6ee', '#12804a', '✓ Open'], red: ['#fdecec', '#c22d2d', '✕ Restricted'], yellow: ['#fff6dc', '#8a6100', '? Unclear'] } as const;

export function applyListBadges(items: ListItem[], s: Settings): void {
  if (!s.country) return;
  for (const it of items) {
    const v = detectCard(it.locationText, { country: s.country, timeZone: s.timeZone });
    if (v.status === 'unset') continue;
    const sig = `${it.key}|${v.status}|${s.hideRed}`;
    if (it.el.getAttribute(MARK) === sig) continue;
    it.el.setAttribute(MARK, sig);
    it.el.querySelector(`[${PILL}]`)?.remove();
    const [bg, fg, label] = COLORS[v.status];
    const pill = document.createElement('span');
    pill.setAttribute(PILL, '');
    pill.setAttribute('data-x-ext-ui', '');
    pill.title = `WorkFromWhere: ${v.reason}`;
    pill.textContent = label;
    pill.style.cssText = `all:initial;display:inline-block;margin:4px 0;padding:1px 7px;border-radius:999px;font:700 11px/1.6 system-ui,sans-serif;background:${bg};color:${fg};border:1px solid ${fg}33;`;
    it.el.prepend(pill);
    const hide = s.hideRed && v.status === 'red';
    if (hide && !it.el.hasAttribute(HIDDEN)) {
      it.el.setAttribute(HIDDEN, (it.el as HTMLElement).style.display || '');
      (it.el as HTMLElement).style.display = 'none';
    } else if (!hide && it.el.hasAttribute(HIDDEN)) {
      (it.el as HTMLElement).style.display = it.el.getAttribute(HIDDEN) ?? '';
      it.el.removeAttribute(HIDDEN);
    }
  }
}

export function clearListBadges(): void {
  document.querySelectorAll(`[${PILL}]`).forEach((p) => p.remove());
  document.querySelectorAll(`[${HIDDEN}]`).forEach((el) => {
    (el as HTMLElement).style.display = el.getAttribute(HIDDEN) ?? '';
    el.removeAttribute(HIDDEN);
  });
  document.querySelectorAll(`[${MARK}]`).forEach((el) => el.removeAttribute(MARK));
}
