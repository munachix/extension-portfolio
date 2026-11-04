/**
 * Playwright helpers: load an unpacked extension and serve local HTML fixtures
 * at real job-site URLs. Every other request is blocked, so tests never hit live sites.
 */
import { chromium, type BrowserContext, type Worker } from '@playwright/test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface ExtensionHarness {
  context: BrowserContext;
  extensionId: string;
  worker: Worker;
  /** Requests that tried to leave the fixture set (should stay empty). */
  blocked: string[];
}

export async function launchExtension(distDir: string): Promise<ExtensionHarness> {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'x-ext-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  // The options page opens on first install; close it so tests start clean.
  for (const p of context.pages()) if (p.url().startsWith('chrome-extension://')) await p.close();
  const blocked: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('chrome-extension://') || url.startsWith('data:')) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  return { context, extensionId, worker, blocked };
}

/** Serve `file` whenever the browser requests `url` (exact, query ignored). */
export async function serveFixture(h: ExtensionHarness, url: string, file: string): Promise<void> {
  const body = await readFile(file, 'utf8');
  const target = url.split(/[?#]/)[0];
  await h.context.route((u) => `${u.origin}${u.pathname}` === target, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }));
}

export async function setStorage(h: ExtensionHarness, items: Record<string, unknown>): Promise<void> {
  await h.worker.evaluate((i) => chrome.storage.local.set(i), items);
}

export async function getStorage<T = unknown>(h: ExtensionHarness, key: string): Promise<T> {
  return h.worker.evaluate((k) => chrome.storage.local.get(k).then((r) => r[k]), key) as Promise<T>;
}
