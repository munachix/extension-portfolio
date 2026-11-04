import { describe, expect, it } from 'vitest';
import { carouselTiles, downscaleSteps, placeImage, suggestTiles, watermarkSpot } from '../src/process/layout';

describe('placeImage', () => {
  it('6000×4000 into 4:5 with a 5% border: full width, centred, never cropped', () => {
    const r = placeImage(6000, 4000, 1080, 1350, 0.05);
    expect(r).toEqual({ x: 54, y: 351, w: 972, h: 648 });
    expect(r.x).toBe(1080 - r.x - r.w); // even left/right
    expect(r.y).toBe(1350 - r.y - r.h); // even top/bottom
  });
  it('portrait photo into 1:1', () => {
    const r = placeImage(3000, 4000, 1080, 1080, 0);
    expect(r).toEqual({ x: 135, y: 0, w: 810, h: 1080 });
  });
  it('border is clamped to 20%', () => expect(placeImage(1000, 1000, 1000, 1000, 0.9).w).toBe(600));
});

describe('helpers', () => {
  it('downscale halves until within 2× of the target', () => expect(downscaleSteps(6000, 4000, 972)).toEqual([{ w: 3000, h: 2000 }, { w: 1500, h: 1000 }]));
  it('watermark corners', () => {
    expect(watermarkSpot(1080, 1350, 200, 40, 'br', 30)).toEqual({ x: 850, y: 1280 });
    expect(watermarkSpot(1080, 1350, 200, 40, 'c', 30)).toEqual({ x: 440, y: 655 });
  });
  it('carousel: 3 seamless tiles across a 3×1080 strip', () => {
    const { strip, tiles } = carouselTiles(9000, 3000, 3, 1080, 1350, 0);
    expect(strip.w).toBe(3240);
    expect(tiles.map((t) => t.x)).toEqual([0, 1080, 2160]);
    expect(suggestTiles(9000, 3000, 1080, 1350)).toBe(4);
  });
});
