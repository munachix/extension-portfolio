/**
 * Image worker: decode, downscale in steps, draw on the bordered canvas,
 * optional watermark + sharpen, encode as JPEG. Re-encoding through a canvas
 * drops all EXIF metadata, including GPS location.
 */
import { carouselTiles, downscaleSteps, placeImage, watermarkSpot, type Corner } from './layout';

export interface Job {
  id: string;
  file: Blob;
  w: number; h: number;
  border: number;
  color: string;
  quality: number;
  sharpen: boolean;
  watermark?: { text?: string; logo?: Blob; corner: Corner; opacity: number; size: number; color: string };
  carousel?: number;
}
export interface Done { id: string; outputs: { blob: Blob; w: number; h: number }[]; error?: string }

async function scaled(src: ImageBitmap, w: number, h: number): Promise<CanvasImageSource> {
  let cur: CanvasImageSource = src;
  let cw = src.width, ch = src.height;
  for (const s of downscaleSteps(cw, ch, w)) {
    const c = new OffscreenCanvas(s.w, s.h);
    const x = c.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, cw, ch, 0, 0, s.w, s.h);
    cur = c; cw = s.w; ch = s.h;
  }
  return cur;
}

function sharpen(ctx: OffscreenCanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, amount = 0.35) {
  const img = ctx.getImageData(r.x, r.y, r.w, r.h);
  const d = img.data, out = new Uint8ClampedArray(d), W = r.w;
  for (let y = 1; y < r.h - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v = d[i + c] * (1 + 4 * amount) - amount * (d[i - 4 + c] + d[i + 4 + c] + d[i - W * 4 + c] + d[i + W * 4 + c]);
        out[i + c] = v;
      }
    }
  }
  ctx.putImageData(new ImageData(out, r.w, r.h), r.x, r.y);
}

async function drawWatermark(ctx: OffscreenCanvasRenderingContext2D, W: number, H: number, wm: NonNullable<Job['watermark']>) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, wm.opacity));
  const margin = W * 0.03;
  if (wm.logo) {
    const logo = await createImageBitmap(wm.logo);
    const lw = Math.round(W * wm.size), lh = Math.round((logo.height / logo.width) * lw);
    const p = watermarkSpot(W, H, lw, lh, wm.corner, margin);
    ctx.drawImage(logo, p.x, p.y, lw, lh);
  } else if (wm.text) {
    const px = Math.round(W * wm.size * 0.25);
    ctx.font = `600 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(wm.text).width;
    const p = watermarkSpot(W, H, tw, px, wm.corner, margin);
    ctx.fillStyle = wm.color;
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = px / 8;
    ctx.fillText(wm.text, p.x, p.y);
  }
  ctx.restore();
}

export async function render(job: Job): Promise<Done> {
  const src = await createImageBitmap(job.file, { imageOrientation: 'from-image', colorSpaceConversion: 'default' });
  const outputs: Done['outputs'] = [];
  const encode = async (c: OffscreenCanvas) => c.convertToBlob({ type: 'image/jpeg', quality: job.quality });
  if (job.carousel && job.carousel >= 2) {
    const { strip, tiles } = carouselTiles(src.width, src.height, job.carousel, job.w, job.h, job.border);
    const big = new OffscreenCanvas(job.carousel * job.w, job.h);
    const bx = big.getContext('2d', { colorSpace: 'srgb' })!;
    bx.fillStyle = job.color;
    bx.fillRect(0, 0, big.width, big.height);
    bx.imageSmoothingQuality = 'high';
    bx.drawImage(await scaled(src, strip.w, strip.h), strip.x, strip.y, strip.w, strip.h);
    if (job.sharpen) sharpen(bx, strip);
    for (const t of tiles) {
      const c = new OffscreenCanvas(job.w, job.h);
      const cx = c.getContext('2d', { colorSpace: 'srgb' })!;
      cx.drawImage(big, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
      if (job.watermark) await drawWatermark(cx, job.w, job.h, job.watermark);
      outputs.push({ blob: await encode(c), w: job.w, h: job.h });
    }
  } else {
    const r = placeImage(src.width, src.height, job.w, job.h, job.border);
    const c = new OffscreenCanvas(job.w, job.h);
    const ctx = c.getContext('2d', { colorSpace: 'srgb' })!;
    ctx.fillStyle = job.color;
    ctx.fillRect(0, 0, job.w, job.h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(await scaled(src, r.w, r.h), r.x, r.y, r.w, r.h);
    if (job.sharpen) sharpen(ctx, r);
    if (job.watermark) await drawWatermark(ctx, job.w, job.h, job.watermark);
    outputs.push({ blob: await encode(c), w: job.w, h: job.h });
  }
  src.close();
  return { id: job.id, outputs };
}

// Worker entry
if (typeof (globalThis as { importScripts?: unknown }).importScripts === 'function') {
  self.onmessage = async (e: MessageEvent<Job>) => {
    try { (self as unknown as Worker).postMessage(await render(e.data)); }
    catch (err) { (self as unknown as Worker).postMessage({ id: e.data.id, outputs: [], error: (err as Error).message } satisfies Done); }
  };
}
