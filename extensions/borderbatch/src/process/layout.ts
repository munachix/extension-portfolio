/** Pure geometry for borders, watermarks and carousel splits. */
export interface Preset { id: string; label: string; w: number; h: number }
// Instagram sizes (2026): feed portrait 4:5, square, the taller 3:4 feed format, and Stories/Reels 9:16.
export const PRESETS: Preset[] = [
  { id: '4x5', label: '4:5 portrait · 1080×1350', w: 1080, h: 1350 },
  { id: '1x1', label: '1:1 square · 1080×1080', w: 1080, h: 1080 },
  { id: '3x4', label: '3:4 tall · 1080×1440', w: 1080, h: 1440 },
  { id: '9x16', label: '9:16 Story · 1080×1920', w: 1080, h: 1920 },
];

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Where the photo goes on the canvas: as large as possible inside the border,
 * never cropped, centred. `border` is a fraction of the canvas width (0–0.2),
 * applied as the MINIMUM gap on every side, so borders are even.
 */
export function placeImage(imgW: number, imgH: number, canvasW: number, canvasH: number, border: number): Rect {
  const b = Math.round(Math.max(0, Math.min(0.2, border)) * canvasW);
  const boxW = canvasW - 2 * b, boxH = canvasH - 2 * b;
  const s = Math.min(boxW / imgW, boxH / imgH);
  const w = Math.round(imgW * s), h = Math.round(imgH * s);
  return { x: Math.round((canvasW - w) / 2), y: Math.round((canvasH - h) / 2), w, h };
}

/** Halve until within 2× of the target, for smooth downscaling (avoids moiré/aliasing). */
export function downscaleSteps(srcW: number, srcH: number, dstW: number): { w: number; h: number }[] {
  const steps: { w: number; h: number }[] = [];
  let w = srcW, h = srcH;
  while (w / 2 >= dstW * 1.0 && w > dstW * 2) { w = Math.round(w / 2); h = Math.round(h / 2); steps.push({ w, h }); }
  return steps;
}

export type Corner = 'br' | 'bl' | 'tr' | 'tl' | 'c';
export function watermarkSpot(canvasW: number, canvasH: number, markW: number, markH: number, corner: Corner, margin: number): { x: number; y: number } {
  const m = Math.round(margin);
  switch (corner) {
    case 'br': return { x: canvasW - markW - m, y: canvasH - markH - m };
    case 'bl': return { x: m, y: canvasH - markH - m };
    case 'tr': return { x: canvasW - markW - m, y: m };
    case 'tl': return { x: m, y: m };
    case 'c': return { x: Math.round((canvasW - markW) / 2), y: Math.round((canvasH - markH) / 2) };
  }
}

/**
 * Carousel splitter: a panorama across N seamless tiles. The panorama is fitted
 * into the strip (N×tileW by tileH, inside the border) and cut into N tiles.
 * Returns, for each tile, the source crop of the *scaled* panorama strip.
 */
export function carouselTiles(imgW: number, imgH: number, n: number, tileW: number, tileH: number, border: number): { strip: Rect; tiles: Rect[] } {
  const stripW = n * tileW;
  const strip = placeImage(imgW, imgH, stripW, tileH, (border * tileW) / stripW);
  const tiles = Array.from({ length: n }, (_, i) => ({ x: i * tileW, y: 0, w: tileW, h: tileH }));
  return { strip, tiles };
}

/** Best number of tiles for a panorama (2–10), so the image fills the strip height. */
export function suggestTiles(imgW: number, imgH: number, tileW: number, tileH: number): number {
  return Math.max(2, Math.min(10, Math.round((imgW / imgH) / (tileW / tileH))));
}
