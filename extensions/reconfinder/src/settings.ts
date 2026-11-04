import type { LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productId: cfg.license.productId ?? undefined, checkoutUrl: cfg.license.checkoutUrl };
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = ['Combinations: 2–3 transactions that explain the difference', 'Paste mode for any statement, CSV or other software', 'Export the candidates to CSV for the client file'];
