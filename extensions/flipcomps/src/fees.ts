/** What each platform takes, and what you keep. US fees, editable (Pro). */
import data from './fees.json';

export type Platform = 'ebay' | 'poshmark' | 'mercari' | 'depop' | 'etsy';
export const PLATFORMS: Platform[] = ['ebay', 'poshmark', 'mercari', 'depop', 'etsy'];
export type FeeTable = typeof data.platforms;
export const DEFAULT_FEES: FeeTable = data.platforms;
export const FEES_AS_OF = data.asOf;

export interface Sale {
  /** Item price the buyer pays. */
  price: number;
  /** Shipping the buyer pays on top (0 if you offer free shipping). */
  buyerShipping: number;
  /** What you pay for the label (Poshmark: buyer pays, so ignored). */
  shipCost: number;
  /** What you paid for the item. */
  cost: number;
  ebayCategory?: keyof FeeTable['ebay']['categories'];
  depopBoosted?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function fee(p: Platform, s: Sale, t: FeeTable = DEFAULT_FEES): number {
  switch (p) {
    case 'ebay': {
      const f = t.ebay;
      const cat = f.categories[s.ebayCategory ?? 'most'] as { pct: number; noPerOrder?: boolean };
      const total = s.price + (f.feeOnShipping ? s.buyerShipping : 0);
      const pct = total <= f.tierLimit ? total * cat.pct : f.tierLimit * cat.pct + (total - f.tierLimit) * f.pctAbove;
      const perOrder = cat.noPerOrder ? 0 : total <= f.perOrderThreshold ? f.perOrderLow : f.perOrderHigh;
      return r2(pct + perOrder);
    }
    case 'poshmark': {
      const f = t.poshmark;
      return r2(s.price < f.flatUnder ? f.flat : s.price * f.pct);
    }
    case 'mercari': return r2((s.price + s.buyerShipping) * t.mercari.pct);
    case 'depop': {
      const f = t.depop;
      const total = s.price + s.buyerShipping;
      return r2(total * (f.pct + (s.depopBoosted ? f.boostPct : 0)) + total * f.processingPct + f.processingFixed);
    }
    case 'etsy': {
      const f = t.etsy;
      const total = s.price + s.buyerShipping;
      return r2(total * f.pct + total * f.processingPct + f.processingFixed + f.listing);
    }
  }
}

export interface Outcome { platform: Platform; name: string; fee: number; payout: number; profit: number; margin: number }

export function outcome(p: Platform, s: Sale, t: FeeTable = DEFAULT_FEES): Outcome {
  const f = fee(p, s, t);
  const buyerPaysLabel = p === 'poshmark';
  const payout = r2(s.price + (buyerPaysLabel ? 0 : s.buyerShipping) - f);
  const profit = r2(payout - (buyerPaysLabel ? 0 : s.shipCost) - s.cost);
  return { platform: p, name: t[p].name, fee: f, payout, profit, margin: s.price ? r2((profit / s.price) * 100) : 0 };
}

/** Lowest price (to the cent) that keeps at least `target` profit. */
export function priceForProfit(p: Platform, target: number, s: Omit<Sale, 'price'>, t: FeeTable = DEFAULT_FEES): number {
  let lo = 0, hi = Math.max(10, (target + s.cost + s.shipCost) * 3);
  while (outcome(p, { ...s, price: hi }, t).profit < target) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (outcome(p, { ...s, price: mid }, t).profit >= target) hi = mid; else lo = mid;
  }
  return Math.ceil(hi * 100) / 100;
}
