import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import type { Corner } from './process/layout';

export interface Look {
  preset: string; border: number; color: string; quality: number; sharpen: boolean;
  wmOn: boolean; wmText: string; wmCorner: Corner; wmOpacity: number; wmSize: number; wmColor: string;
  carousel: boolean; tiles: number;
}
export const DEFAULT_LOOK: Look = { preset: '4x5', border: 0.04, color: '#ffffff', quality: 0.9, sharpen: false, wmOn: false, wmText: '', wmCorner: 'br', wmOpacity: 0.7, wmSize: 0.2, wmColor: '#ffffff', carousel: false, tiles: 3 };
export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productIds: (cfg.license as { productIds?: string[] }).productIds, checkoutUrl: cfg.license.checkoutUrl };
export const FREE_BATCH = cfg.freeBatch;
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const FREE_FEATURES = 'every border and size preset, 20 photos per batch, one-click ZIP download, GPS removal, no watermark from us.';
export const PRO_FEATURES = ['Unlimited batch size', 'Text or logo watermark: position, opacity, size', 'Carousel splitter: panorama → 2–10 seamless 4:5 slides', 'Saved looks, JPEG quality slider, light sharpening'];

export const looks = {
  last: async () => ({ ...DEFAULT_LOOK, ...(await store.get<Partial<Look>>('look', {})) }),
  saveLast: (l: Look) => store.set('look', l),
  saved: () => store.get<Record<string, Look>>('savedLooks', {}),
  saveNamed: (name: string, l: Look) => store.update<Record<string, Look>>('savedLooks', {}, (m) => ({ ...m, [name]: l })),
  remove: (name: string) => store.update<Record<string, Look>>('savedLooks', {}, (m) => { const { [name]: _, ...rest } = m; return rest; }),
};
