/** Shared helpers for the dataset readers. */
import ExcelJS from 'exceljs';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const UA = 'VisaFlag-data-pipeline/1.0 (+https://github.com/; public open-data refresh)';

export async function getText(url, f = fetch) {
  const res = await f(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/csv,application/json,*/*' } });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.text();
}

/** Download to a temp file (big Excel files shouldn't sit in memory). */
export async function download(url, f = fetch) {
  const res = await f(url, { headers: { 'User-Agent': UA } });
  if (!res.ok || !res.body) throw new Error(`${url} returned HTTP ${res.status}`);
  const dir = await mkdtemp(path.join(tmpdir(), 'visaflag-'));
  const file = path.join(dir, path.basename(new URL(url).pathname) || 'download');
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  return { file, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
};

/**
 * Calls onRow(cells) for every row of the first worksheet, streaming.
 * (exceljs's reader breaks if rows are pulled lazily through a generator,
 * so rows are pushed to a callback instead.)
 */
export async function forEachXlsxRow(file, onRow) {
  let sent = 0;
  try {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: 'cache', hyperlinks: 'ignore', styles: 'ignore', worksheets: 'emit' });
    let first = true;
    for await (const sheet of reader) {
      for await (const row of sheet) {
        if (!first) continue;
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        onRow(values.map((v) => cellText(v).trim()));
        sent++;
      }
      first = false;
    }
  } catch (e) {
    // exceljs's stream reader fails on files whose parts are stored in an unusual
    // order (workbook after sheets). Read those the normal way instead.
    if (sent > 0 || !/sheets/.test(String(e?.message))) throw e;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    wb.worksheets[0]?.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      onRow(values.map((v) => cellText(v).trim()));
    });
  }
}

/** Find the header row (first row containing a cell matching `needle`) and map names -> index. */
export function headerIndex(row, wanted) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const cells = row.map(norm);
  const out = {};
  for (const [key, names] of Object.entries(wanted)) {
    const i = cells.findIndex((c) => names.some((n) => c === norm(n)));
    if (i >= 0) out[key] = i;
  }
  return out;
}

export function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export const today = () => new Date().toISOString().slice(0, 10);

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
