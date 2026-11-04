import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productIds: (cfg.license as { productIds?: string[] }).productIds, checkoutUrl: cfg.license.checkoutUrl };
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const FREE_COMBO_RECS = 3;
export const PRO_FEATURES = ['Combinations on every reconciliation: 2–3 transactions that explain the difference (free: 3 a month)', 'Paste mode for any statement, CSV or other software', 'Export the candidates to CSV for the client file'];
export const FREE_FEATURES = 'duplicates, missing ticks, wrong signs and transposed digits on every QuickBooks reconciliation, plus combinations on 3 reconciliations a month.';

/** Combination search on 3 different reconciliations (by page URL) per calendar month. */
export async function useComboReconciliation(recKey: string, month = new Date().toISOString().slice(0, 7)): Promise<{ ok: boolean; left: number }> {
  let res = { ok: false, left: 0 };
  await store.update<{ month: string; recs: string[] }>('comboAllowance', { month, recs: [] }, (a) => {
    const cur = a.month === month ? a : { month, recs: [] };
    if (cur.recs.includes(recKey)) { res = { ok: true, left: FREE_COMBO_RECS - cur.recs.length }; return cur; }
    if (cur.recs.length >= FREE_COMBO_RECS) return cur;
    const next = { month, recs: [...cur.recs, recKey] };
    res = { ok: true, left: FREE_COMBO_RECS - next.recs.length };
    return next;
  });
  return res;
}
