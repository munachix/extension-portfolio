/**
 * Sponsor data: downloaded weekly from our GitHub Pages site, kept in IndexedDB
 * (the UK list alone is 127k rows), matched in the background service worker.
 */
import { store } from '@ext/core';
import { ALL, describe, INFO, type CC, type Dataset, type Result } from './countries';
import { Matcher } from './match/matcher';

export interface SyncInfo { updated?: string; count?: number; checkedAt?: number; error?: string; stale?: boolean }
type Index = { countries: Partial<Record<CC, { updated: string; count: number; file: string; stale?: boolean }>> };

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('visaflag', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('datasets');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction('datasets', mode).objectStore('datasets'));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export const getDataset = (cc: CC) => idb<Dataset | undefined>('readonly', (s) => s.get(cc) as IDBRequest<Dataset | undefined>);
const putDataset = (ds: Dataset) => idb('readwrite', (s) => s.put(ds, ds.country));

async function readMaybeGzip(res: Response): Promise<unknown> {
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).json();
  }
  return JSON.parse(new TextDecoder().decode(buf));
}

/** Download any country in `wanted` whose published data is newer than what we have. */
export async function sync(base: string, wanted: CC[], force = false, f: typeof fetch = fetch): Promise<Partial<Record<CC, SyncInfo>>> {
  const state = await store.get<Partial<Record<CC, SyncInfo>>>('sync', {});
  let index: Index;
  try {
    const res = await f(`${base}/index.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    index = (await res.json()) as Index;
  } catch (e) {
    for (const cc of wanted) state[cc] = { ...state[cc], checkedAt: Date.now(), error: `Couldn't check for updates (${(e as Error).message})` };
    await store.set('sync', state);
    return state;
  }
  for (const cc of wanted) {
    const entry = index.countries[cc];
    if (!entry) { state[cc] = { ...state[cc], checkedAt: Date.now(), error: 'No data published yet' }; continue; }
    const have = await getDataset(cc);
    if (!force && have && have.updated === entry.updated) {
      state[cc] = { updated: have.updated, count: have.rows.length, checkedAt: Date.now(), stale: entry.stale };
      continue;
    }
    try {
      const res = await f(`${base}/${entry.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ds = (await readMaybeGzip(res)) as Dataset;
      if (!Array.isArray(ds.rows) || ds.country !== cc) throw new Error('unexpected file');
      await putDataset(ds);
      matchers.delete(cc);
      state[cc] = { updated: ds.updated, count: ds.rows.length, checkedAt: Date.now(), stale: entry.stale };
    } catch (e) {
      state[cc] = { ...state[cc], checkedAt: Date.now(), error: `Update failed (${(e as Error).message}); using the last good data` };
    }
  }
  await store.set('sync', state);
  return state;
}

const matchers = new Map<CC, Promise<{ ds: Dataset; m: Matcher } | null>>();
function matcherFor(cc: CC) {
  let p = matchers.get(cc);
  if (!p) {
    p = getDataset(cc).then((ds) => (ds ? { ds, m: new Matcher(ds.rows.map((r) => String(r[0]))) } : null));
    matchers.set(cc, p);
  }
  return p;
}

export async function lookup(name: string, countries: CC[], pro: boolean): Promise<Result[]> {
  const out: Result[] = [];
  for (const cc of countries.filter((c) => ALL.includes(c))) {
    const x = await matcherFor(cc);
    if (!x) { out.push({ cc, status: 'nodata', label: `${INFO[cc].short} data not downloaded yet`, details: [] }); continue; }
    const hit = x.m.lookup(name);
    if (!hit) { out.push({ cc, status: 'no', label: INFO[cc].no, details: [] }); continue; }
    const row = x.ds.rows[hit.rows[0]];
    out.push({ cc, status: hit.kind === 'exact' ? 'yes' : 'likely', label: hit.kind === 'exact' ? INFO[cc].yes : `Likely: ${INFO[cc].yes.toLowerCase()}`, official: String(row[0]), details: describe(x.ds, row, pro) });
  }
  return out;
}
