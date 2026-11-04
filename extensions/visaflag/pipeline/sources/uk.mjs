/** UK: Register of licensed sponsors: workers (GOV.UK, CSV, updated most working days). */
import { parseCsv } from '../../../../tools/scorecard/lib/csv.mjs';
import { getText, today } from './common.mjs';

export const PAGE = 'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers';

export function parseUK(csv) {
  const raw = parseCsv(csv);
  if (!raw.length) throw new Error('UK: CSV is empty');
  const cols = Object.keys(raw[0]);
  const col = (re) => cols.find((c) => re.test(c));
  const c = { name: col(/organi[sz]ation name/i), town: col(/town|city/i), rating: col(/type.*rating|rating/i), route: col(/route/i) };
  for (const [k, v] of Object.entries(c)) if (!v) throw new Error(`UK: column for "${k}" not found (headers: ${cols.join(', ')})`);
  const orgs = new Map();
  for (const r of raw) {
    const name = r[c.name].replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const o = orgs.get(name) ?? { town: r[c.town], ratings: new Set(), routes: new Set() };
    const rating = r[c.rating].match(/\b([AB])\s*\(?\s*(?:rating|premium)/i)?.[1] ?? r[c.rating].match(/\(([AB])[^)]*\)/)?.[1];
    if (rating) o.ratings.add(rating.toUpperCase());
    if (r[c.route]) o.routes.add(r[c.route].trim());
    orgs.set(name, o);
  }
  const rows = [...orgs].map(([name, o]) => [name, o.town ?? '', o.ratings.has('A') ? 'A' : o.ratings.has('B') ? 'B' : '', [...o.routes].join('|')]);
  return { fields: ['name', 'town', 'rating', 'routes'], rows };
}

export async function fetchUK({ fetch: f = fetch } = {}) {
  const page = await getText(PAGE, f);
  const link = page.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/[^"'\s>]+\.csv/)?.[0];
  if (!link) throw new Error('UK: CSV link not found on the GOV.UK page');
  const parsed = parseUK(await getText(link, f));
  return { ...parsed, updated: link.match(/(\d{4}-\d{2}-\d{2})\.csv$/)?.[1] ?? today(), source: link, minRows: 50000 };
}
