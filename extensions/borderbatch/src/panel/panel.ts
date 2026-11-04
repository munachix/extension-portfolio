/** BorderBatch side panel: drop photos, pick a look, download. Everything runs offline. */
import { isPro } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import { zipSync } from 'fflate';
import { PRESETS, suggestTiles } from '../process/layout';
import type { Done, Job } from '../process/worker';
import { DEFAULT_LOOK, FREE_BATCH, FREE_FEATURES, LICENSE, looks, PRICE, PRO_FEATURES, PRODUCT, type Look } from '../settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let look: Look = DEFAULT_LOOK;
let pro = false;
let logo: Blob | undefined;
interface Item { id: string; file: File; status: 'waiting' | 'working' | 'done' | 'error'; outputs: { blob: Blob; url: string; name: string }[]; error?: string }
let items: Item[] = [];

// ---------- worker pool ----------
const POOL = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
const workers = Array.from({ length: POOL }, () => new Worker(chrome.runtime.getURL('worker.js')));
const idle = [...workers];
const queue: (() => void)[] = [];
function run(job: Job): Promise<Done> {
  return new Promise((resolve) => {
    const go = () => {
      const w = idle.pop()!;
      w.onmessage = (e: MessageEvent<Done>) => { idle.push(w); resolve(e.data); queue.shift()?.(); };
      w.postMessage(job);
    };
    idle.length ? go() : queue.push(go);
  });
}

const baseName = (f: File) => f.name.replace(/\.[^.]+$/, '');
const preset = () => PRESETS.find((p) => p.id === look.preset) ?? PRESETS[0];

async function processAll() {
  const p = preset();
  const todo = items.filter((i) => i.status === 'waiting');
  await Promise.all(todo.map(async (it) => {
    it.status = 'working';
    renderList();
    const job: Job = {
      id: it.id, file: it.file, w: p.w, h: p.h, border: look.border, color: look.color,
      quality: pro ? look.quality : 0.9, sharpen: pro && look.sharpen,
      watermark: pro && look.wmOn && (look.wmText || logo) ? { text: look.wmText, logo, corner: look.wmCorner, opacity: look.wmOpacity, size: look.wmSize, color: look.wmColor } : undefined,
      carousel: pro && look.carousel ? look.tiles : undefined,
    };
    const res = await run(job);
    if (res.error) { it.status = 'error'; it.error = res.error; }
    else {
      it.status = 'done';
      it.outputs = res.outputs.map((o, k) => ({ blob: o.blob, url: URL.createObjectURL(o.blob), name: `${baseName(it.file)}_${p.id}${res.outputs.length > 1 ? `_${k + 1}` : ''}.jpg` }));
    }
    renderList();
  }));
}

function addFiles(files: FileList | File[]) {
  const imgs = [...files].filter((f) => /^image\/(jpeg|png|webp|heic|heif|avif|gif|bmp)$/.test(f.type) || /\.(jpe?g|png|webp|heic|avif)$/i.test(f.name));
  const room = pro ? Infinity : FREE_BATCH - items.length;
  const take = imgs.slice(0, Math.max(0, room));
  if (take.length < imgs.length) $('msg').textContent = `Free version: up to ${FREE_BATCH} photos at a time. Get Pro for unlimited batches.`;
  items.push(...take.map((file) => ({ id: crypto.randomUUID(), file, status: 'waiting' as const, outputs: [] })));
  if (look.carousel && take[0]) {
    void createImageBitmap(take[0]).then((b) => { look.tiles = suggestTiles(b.width, b.height, preset().w, preset().h); ($('tiles') as HTMLInputElement).value = String(look.tiles); b.close(); });
  }
  renderList();
}

function download(url: string, name: string) {
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
}

async function downloadZip() {
  const files: Record<string, Uint8Array> = {};
  for (const it of items) for (const o of it.outputs) files[o.name] = new Uint8Array(await o.blob.arrayBuffer());
  const zip = zipSync(files, { level: 0 }); // JPEGs are already compressed
  download(URL.createObjectURL(new Blob([zip], { type: 'application/zip' })), `BorderBatch_${preset().id}_${new Date().toISOString().slice(0, 10)}.zip`);
}

function renderList() {
  const list = $('list');
  list.replaceChildren(...items.map((it) => {
    const row = document.createElement('div');
    row.className = 'item';
    const thumb = document.createElement('img');
    thumb.alt = '';
    thumb.src = it.outputs[0]?.url ?? '';
    if (!it.outputs[0]) thumb.style.visibility = 'hidden';
    const name = document.createElement('div');
    name.className = 'nm';
    name.textContent = it.file.name;
    const st = document.createElement('div');
    st.className = 'x-muted';
    st.textContent = it.status === 'done' ? `${it.outputs.length} file(s) · ${(it.outputs.reduce((s, o) => s + o.blob.size, 0) / 1024).toFixed(0)} KB · GPS removed` : it.status === 'error' ? `Couldn’t read this file: ${it.error}` : it.status === 'working' ? 'Working…' : 'Ready';
    const info = document.createElement('div');
    info.append(name, st);
    row.append(thumb, info);
    for (const o of it.outputs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.outputs.length > 1 ? `↓ ${o.name.match(/_(\d+)\.jpg$/)?.[1]}` : '↓';
      b.title = `Download ${o.name}`;
      b.addEventListener('click', () => download(o.url, o.name));
      row.append(b);
    }
    return row;
  }));
  const done = items.some((i) => i.status === 'done');
  ($('zip') as HTMLButtonElement).hidden = !done;
  ($('go') as HTMLButtonElement).disabled = !items.some((i) => i.status === 'waiting');
  $('count').textContent = items.length ? `${items.length} photo(s)` : '';
}

function bindControls() {
  const bind = <K extends keyof Look>(id: string, key: K, parse: (v: string, el: HTMLInputElement) => Look[K]) => {
    const el = $(id) as HTMLInputElement;
    const v = look[key];
    if (el.type === 'checkbox') el.checked = !!v; else el.value = String(key === 'border' ? Math.round((v as number) * 100) : key === 'quality' || key === 'wmOpacity' || key === 'wmSize' ? Math.round((v as number) * 100) : v);
    el.addEventListener('input', () => {
      look = { ...look, [key]: parse(el.value, el) };
      void looks.saveLast(look);
      // re-render existing photos with the new look
      for (const it of items) { if (it.status !== 'working') { it.status = 'waiting'; it.outputs = []; } }
      renderList();
      updateLabels();
    });
  };
  const num = (v: string) => Number(v) / 100;
  bind('preset', 'preset', (v) => v);
  bind('border', 'border', num);
  bind('color', 'color', (v) => v);
  bind('quality', 'quality', num);
  bind('sharpen', 'sharpen', (_v, el) => el.checked);
  bind('wmOn', 'wmOn', (_v, el) => el.checked);
  bind('wmText', 'wmText', (v) => v);
  bind('wmCorner', 'wmCorner', (v) => v as Look['wmCorner']);
  bind('wmOpacity', 'wmOpacity', num);
  bind('wmSize', 'wmSize', num);
  bind('wmColor', 'wmColor', (v) => v);
  bind('carousel', 'carousel', (_v, el) => el.checked);
  bind('tiles', 'tiles', (v) => Math.max(2, Math.min(10, Number(v) || 3)));
  ($('logo') as HTMLInputElement).addEventListener('change', (e) => { logo = (e.target as HTMLInputElement).files?.[0]; for (const it of items) { it.status = 'waiting'; it.outputs = []; } renderList(); });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-color]')) b.addEventListener('click', () => { ($('color') as HTMLInputElement).value = b.dataset.color!; $('color').dispatchEvent(new Event('input')); });
}

function updateLabels() {
  $('borderVal').textContent = `${Math.round(look.border * 100)}%`;
  $('qualityVal').textContent = `${Math.round(look.quality * 100)}`;
  document.querySelectorAll<HTMLElement>('.pro-only').forEach((el) => el.classList.toggle('x-locked', !pro));
}

async function savedLooksUi() {
  const box = $('looks');
  const saved = await looks.saved();
  box.replaceChildren(...Object.keys(saved).map((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', async () => { look = saved[name]; await looks.saveLast(look); location.reload(); });
    return b;
  }));
}

async function init() {
  pro = await isPro();
  look = await looks.last();
  const sel = $('preset') as HTMLSelectElement;
  for (const p of PRESETS) sel.add(new Option(p.label, p.id));
  bindControls();
  updateLabels();
  await savedLooksUi();
  const drop = $('drop');
  const input = $('files') as HTMLInputElement;
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files) addFiles(input.files); input.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });
  $('go').addEventListener('click', () => void processAll());
  $('zip').addEventListener('click', () => void downloadZip());
  $('clear').addEventListener('click', () => { items.forEach((i) => i.outputs.forEach((o) => URL.revokeObjectURL(o.url))); items = []; $('msg').textContent = ''; renderList(); });
  $('saveLook').addEventListener('click', async () => { const n = prompt('Name this look (e.g. “My IG style”)'); if (n) { await looks.saveNamed(n.slice(0, 30), look); await savedLooksUi(); } });
  await renderPaywall($('pro'), { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, freeText: FREE_FEATURES, onChange: () => location.reload() });
  renderList();
}

void init();
