/**
 * Reads the QuickBooks Online Reconcile screen the user has open: the
 * Difference figure and the transaction grid (columns found by their headers).
 * Read-only. Modelled on QBO's Reconcile layout; QBO needs a login, so verify live.
 */
import { toCents, type Tx } from './engine';

export const isReconcilePage = (url: URL) => /reconcile/i.test(url.pathname + url.hash) && !/history|report/i.test(url.pathname);
const txt = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
const MONEY = /[−-]?\(?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?/;

/** Amount shown next to a label like "Difference" / "Statement ending balance". */
export function readLabelled(doc: Document, label: RegExp): number | null {
  const els = [...doc.querySelectorAll('div, span, p, td, th, dt, label, h2, h3, h4')].filter((e) => label.test(txt(e)) && txt(e).length < 40);
  for (const e of els) {
    let box: Element | null = e;
    for (let i = 0; box && i < 3; i++, box = box.parentElement) {
      const t = txt(box).replace(txt(e), ' ');
      const m = t.match(MONEY);
      if (m) return toCents(m[0]);
    }
  }
  return null;
}

export function readDifference(doc: Document): number | null {
  const d = readLabelled(doc, /^difference$/i);
  if (d != null) return d;
  const st = readLabelled(doc, /^statement ending balance$/i);
  const cl = readLabelled(doc, /^cleared balance$/i);
  return st != null && cl != null ? st - cl : null;
}

export interface Row { tx: Tx; el: HTMLElement }

export function readRows(doc: Document): Row[] {
  const rows = [...doc.querySelectorAll<HTMLElement>('tr, [role="row"]')];
  const cellsOf = (r: Element) => [...r.querySelectorAll(':scope > td, :scope > th, :scope > [role="cell"], :scope > [role="gridcell"], :scope > [role="columnheader"]')];
  const headerIdx = rows.findIndex((r) => { const t = cellsOf(r).map(txt).join('|').toUpperCase(); return /PAYMENT/.test(t) && /DEPOSIT/.test(t); });
  if (headerIdx < 0) return [];
  const head = cellsOf(rows[headerIdx]).map((c) => txt(c).toUpperCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const c = { date: col(/^DATE/), payee: col(/PAYEE|NAME/), payment: col(/PAYMENT|CHARGE/), deposit: col(/DEPOSIT|PAYMENT RECEIVED/), memo: col(/MEMO/), ref: col(/REF/) };
  const out: Row[] = [];
  const table = rows[headerIdx].closest('table, [role="grid"], [role="table"]') ?? doc;
  rows.slice(headerIdx + 1).forEach((r, i) => {
    if (!table.contains(r)) return;
    const cells = cellsOf(r);
    if (cells.length < Math.max(c.payment, c.deposit) + 1) return;
    const pay = toCents(txt(cells[c.payment]) || '0') ?? 0;
    const dep = toCents(txt(cells[c.deposit]) || '0') ?? 0;
    if (!pay && !dep) return;
    const box = r.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const aria = r.querySelector('[role="checkbox"]');
    const cleared = box ? box.checked : aria?.getAttribute('aria-checked') === 'true';
    const payee = [c.payee >= 0 ? txt(cells[c.payee]) : '', c.ref >= 0 && txt(cells[c.ref]) ? `#${txt(cells[c.ref])}` : ''].filter(Boolean).join(' ');
    out.push({ el: r, tx: { id: r.getAttribute('data-id') ?? r.id ?? `r${i}`, date: c.date >= 0 ? txt(cells[c.date]) : '', payee, amount: dep - Math.abs(pay), cleared } });
  });
  // ids must be unique
  out.forEach((x, i) => { if (!x.tx.id || out.findIndex((y) => y.tx.id === x.tx.id) !== i) x.tx.id = `r${i}`; });
  return out;
}

/** Free extra: tab titles you can tell apart ("Acme Ltd · Reconcile"). */
export function tabTitle(doc: Document): string | null {
  const company = txt(doc.querySelector('[data-qbo-company-name], [data-testid*="company-name" i], [class*="companyName" i], [aria-label*="company name" i]'));
  const page = txt(doc.querySelector('h1')) || txt(doc.querySelector('[data-testid*="page-title" i], [class*="pageTitle" i]'));
  if (!company && !page) return null;
  return [company, page].filter(Boolean).join(' · ').slice(0, 80);
}
