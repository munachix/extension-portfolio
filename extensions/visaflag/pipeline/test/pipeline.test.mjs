import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseUK } from '../sources/uk.mjs';
import { parseNL } from '../sources/nl.mjs';
import { addQuarter, finish as finishCA, pickResources } from '../sources/ca.mjs';
import { addYear, annualWage, finish as finishUS, knownFiles, pickFiles } from '../sources/us.mjs';
import { forEachXlsxRow } from '../sources/common.mjs';
import { buildAll } from '../build.mjs';

describe('UK register CSV', () => {
  const csv = 'Organisation Name,Town/City,County,Type & Rating,Route\n"Acme Ltd",London,,Worker (A rating),Skilled Worker\n"Acme Ltd",London,,Worker (A rating),Global Business Mobility: Senior or Specialist Worker\n"Beta Care Ltd",Leeds,,Worker (B rating),Skilled Worker\n';
  it('merges routes per organisation and keeps the rating', () => {
    expect(parseUK(csv).rows).toEqual([
      ['Acme Ltd', 'London', 'A', 'Skilled Worker|Global Business Mobility: Senior or Specialist Worker'],
      ['Beta Care Ltd', 'Leeds', 'B', 'Skilled Worker'],
    ]);
  });
  it('fails loudly when a column disappears', () => {
    expect(() => parseUK('Name,Town\nA,B\n')).toThrow(/column for "name"/);
  });
});

describe('Netherlands IND table', () => {
  it('reads organisation + KVK and decodes entities', () => {
    const html = '<table><tr><th>Organisation</th><th>KVK (Chamber of Commerce) number</th></tr><tr><td>&quot;Aa-Dee&quot; Machinefabriek B.V.</td><td>16051874</td></tr><tr><td><span>Tom &amp; Co</span></td><td>123</td></tr></table>';
    expect(parseNL(html).rows).toEqual([['"Aa-Dee" Machinefabriek B.V.', '16051874'], ['Tom & Co', '123']]);
  });
});

describe('Canada LMIA', () => {
  it('picks the 4 newest English quarterly files', () => {
    const res = ['2025q1', '2026q2', '2025q3', '2026q1', '2025q4'].map((p) => ({ url: `https://x/tfwp_${p}_pos_en.xlsx` })).concat([{ url: 'https://x/tfwp_2026q2_pos_fr.xlsx' }]);
    expect(pickResources({ result: { resources: res } }).map((r) => r.period)).toEqual(['2026Q2', '2026Q1', '2025Q4', '2025Q3']);
  });
  it('skips title rows, sums positions across quarters', () => {
    const map = new Map();
    addQuarter(map, [['Positive LMIA employers, Q1'], ['Province/Territory', 'Program Stream', 'Employer', 'Address', 'Occupation', 'Incorporate Status', 'Approved LMIAs', 'Approved Positions'], ['Ontario', 'High-wage', 'Maple Tech Inc.', 'Toronto', '21231', 'Yes', '1', '3']], '2026Q1');
    addQuarter(map, [['Province/Territory', 'Program Stream', 'Employer', 'Address', 'Occupation', 'Incorporate Status', 'Approved LMIAs', 'Approved Positions'], ['Alberta', 'High-wage', 'Maple Tech Inc.', 'Calgary', '21231', 'Yes', '1', '2'], ['Notes: list excludes personal names']], '2026Q2');
    expect(finishCA(map).rows).toEqual([['Maple Tech Inc.', 5, '2026Q2', 'Ontario|Alberta']]);
  });
});

describe('US LCA', () => {
  it('finds the newest file per fiscal year', () => {
    const html = '<a href="/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q4.xlsx">x</a><a href="/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q3.xlsx">x</a><a href="https://www.dol.gov//media/LCA_Disclosure_Data_FY2026_Q3.xlsx">x</a>';
    const { current, previous } = pickFiles(html);
    expect(current).toMatchObject({ fy: 2026, q: 3, url: 'https://www.dol.gov/media/LCA_Disclosure_Data_FY2026_Q3.xlsx' });
    expect(previous).toMatchObject({ fy: 2025, q: 4 });
  });
  it('falls back to known files and picks up a newly posted quarter', async () => {
    const known = { current: { fy: 2026, q: 3, url: 'a' }, previous: { fy: 2025, q: 4, url: 'b' } };
    const posted = new Set(['https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2026_Q4.xlsx']);
    const f = async (url) => new Response(null, { status: posted.has(url) ? 200 : 404 });
    const r = await knownFiles(f, known);
    expect(r.current).toMatchObject({ fy: 2026, q: 4 });
    expect(r.previous).toMatchObject({ fy: 2025, q: 4 });
    posted.add('https://www.dol.gov/media/LCA_Disclosure_Data_FY2027_Q1.xlsx');
    const r2 = await knownFiles(f, known);
    expect(r2.current).toMatchObject({ fy: 2027, q: 1 });
    expect(r2.previous).toMatchObject({ fy: 2026, q: 4 });
  });
  it('annualises wages and drops nonsense', () => {
    expect(annualWage('$50.00', 'Hour')).toBe(104000);
    expect(annualWage('120,000', 'Year')).toBe(120000);
    expect(annualWage('5', 'Year')).toBeNull();
  });
  it('counts certified H-1B only, by year, with a median wage', async () => {
    const H = ['CASE_NUMBER', 'CASE_STATUS', 'VISA_CLASS', 'EMPLOYER_NAME', 'EMPLOYER_STATE', 'WAGE_RATE_OF_PAY_FROM', 'WAGE_UNIT_OF_PAY'];
    const map = new Map();
    await addYear(map, [H, ['1', 'Certified', 'H-1B', 'Google LLC', 'CA', '150000', 'Year'], ['2', 'Denied', 'H-1B', 'Google LLC', 'CA', '1', 'Year'], ['3', 'Certified', 'E-3 Australian', 'Google LLC', 'CA', '1', 'Year']], 'curr');
    await addYear(map, [H, ['4', 'Certified', 'H-1B', 'Google LLC', 'CA', '100000', 'Year'], ['5', 'Certified', 'H-1B', 'Google LLC', 'CA', '200000', 'Year']], 'prev');
    expect(finishUS(map).rows).toEqual([['Google LLC', 2, 1, 150000, 'CA']]);
  });
});

describe('xlsx streaming + build', () => {
  it('reads a real .xlsx file row by row', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'vf-'));
    const file = path.join(dir, 't.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['Employer', 'Approved Positions']);
    ws.addRow(['Maple Tech Inc.', 3]);
    await wb.xlsx.writeFile(file);
    const rows = [];
    await forEachXlsxRow(file, (r) => rows.push(r));
    expect(rows).toEqual([['Employer', 'Approved Positions'], ['Maple Tech Inc.', '3']]);
  });
  it('writes gzipped files + index, and keeps last good data when a source fails', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'vf-out-'));
    const prevIndex = { countries: { nl: { name: 'Netherlands', updated: '2026-10-01', count: 9000, file: 'sponsors-nl.json.gz', bytes: 10 } } };
    const f = async (url) => {
      if (url === 'https://prev.example/index.json') return new Response(JSON.stringify(prevIndex));
      if (url === 'https://prev.example/sponsors-nl.json.gz') return new Response('OLD');
      if (url.includes('ind.nl')) return new Response('down', { status: 503 });
      throw new Error('unexpected ' + url);
    };
    const { index, failures } = await buildAll({ countries: ['nl'], out, previousBase: 'https://prev.example', fetch: f, log: () => {} });
    expect(failures[0].error).toMatch(/503/);
    expect(index.countries.nl).toMatchObject({ stale: true, updated: '2026-10-01' });
    expect(await readFile(path.join(out, 'sponsors-nl.json.gz'), 'utf8')).toBe('OLD');
    expect(JSON.parse(await readFile(path.join(out, 'report.json'), 'utf8')).ok).toBe(false);
  });
  it('publishes a committed snapshot when a download is refused (US)', async () => {
    const { gzipSync } = await import('node:zlib');
    const { writeFile, mkdir } = await import('node:fs/promises');
    const snaps = await mkdtemp(path.join(tmpdir(), 'vf-snap-'));
    await mkdir(snaps, { recursive: true });
    await writeFile(path.join(snaps, 'sponsors-us.json.gz'), gzipSync(JSON.stringify({ country: 'us', updated: 'FY2026 Q3', rows: [['Google LLC', 1, 2, 150000, 'CA']] })));
    const out = await mkdtemp(path.join(tmpdir(), 'vf-out-'));
    const f = async () => new Response('Forbidden', { status: 403 });
    const { index, failures } = await buildAll({ countries: ['us'], out, fetch: f, log: () => {}, snapshots: snaps });
    expect(failures).toEqual([]);
    expect(index.countries.us).toMatchObject({ updated: 'FY2026 Q3', count: 1, snapshot: true });
  });
  it('reads fiscal year/quarter from DOL file names', async () => {
    const { fyOf } = await import('../sources/us.mjs');
    expect(fyOf('/Downloads/LCA_Disclosure_Data_FY2026_Q3.xlsx')).toEqual({ fy: 2026, q: 3 });
    expect(() => fyOf('lca.xlsx')).toThrow(/Keep DOL/);
  });
  it('rejects a suspiciously small dataset', async () => {
    const out = await mkdtemp(path.join(tmpdir(), 'vf-out-'));
    const f = async () => new Response('<table><tr><td>Only One B.V.</td><td>1</td></tr></table>');
    const { failures } = await buildAll({ countries: ['nl'], out, fetch: f, log: () => {} });
    expect(failures[0].error).toMatch(/only 1 rows/);
  });
});
