/** Netherlands: IND public register of recognised sponsors, "Work" (one HTML table, updated monthly). */
import { decodeEntities, getText, today } from './common.mjs';

export const PAGE = 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work';

const strip = (h) => decodeEntities(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseNL(html) {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error('NL: no table found on the IND page');
  const rows = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []).map(strip);
    if (cells.length < 1 || /^organi[sz]ation$/i.test(cells[0])) continue;
    if (cells[0]) rows.push([cells[0], cells[1] ?? '']);
  }
  return { fields: ['name', 'kvk'], rows };
}

export async function fetchNL({ fetch: f = fetch } = {}) {
  return { ...parseNL(await getText(PAGE, f)), updated: today(), source: PAGE, minRows: 5000 };
}
