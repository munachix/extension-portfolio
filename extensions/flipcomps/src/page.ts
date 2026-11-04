/**
 * Reads the page the user is on: a listing (title + price) or a sold-results
 * page (prices of the visible sold items). Read-only; nothing is fetched.
 */
import { parsePrice } from './stats';
import type { Platform } from './fees';

export interface Listing { platform: Platform; title: string; price: number | null }

export function platformOf(host: string): Platform | null {
  if (/(^|\.)ebay\.com$/.test(host)) return 'ebay';
  if (/(^|\.)poshmark\.com$/.test(host)) return 'poshmark';
  if (/(^|\.)mercari\.com$/.test(host)) return 'mercari';
  if (/(^|\.)depop\.com$/.test(host)) return 'depop';
  if (/(^|\.)etsy\.com$/.test(host)) return 'etsy';
  return null;
}

const LISTING_PATH: Record<Platform, RegExp> = { ebay: /^\/itm\//, poshmark: /^\/listing\//, mercari: /^\/(us\/)?item\//, depop: /^\/products\//, etsy: /^\/listing\// };

function jsonLdProduct(doc: Document): { name?: string; price?: number } | null {
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let d: unknown;
    try { d = JSON.parse(s.textContent ?? ''); } catch { continue; }
    const list = (Array.isArray(d) ? d : [d, ...((d as { '@graph'?: unknown[] })?.['@graph'] ?? [])]) as Record<string, unknown>[];
    for (const it of list) {
      if (!it || !/product/i.test(String(it['@type']))) continue;
      const offers = (Array.isArray(it.offers) ? it.offers[0] : it.offers) as Record<string, unknown> | undefined;
      const price = Number(offers?.price ?? offers?.lowPrice);
      return { name: String(it.name ?? ''), price: Number.isFinite(price) && price > 0 ? price : undefined };
    }
  }
  return null;
}
const meta = (doc: Document, p: string) => doc.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.getAttribute('content') ?? '';
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function readListing(doc: Document, url: URL): Listing | null {
  const platform = platformOf(url.hostname);
  if (!platform || !LISTING_PATH[platform].test(url.pathname)) return null;
  const ld = jsonLdProduct(doc);
  const title = clean(ld?.name || doc.querySelector('h1')?.textContent || meta(doc, 'og:title') || doc.title);
  const metaPrice = Number(meta(doc, 'product:price:amount') || meta(doc, 'og:price:amount'));
  const domPrice = parsePrice(doc.querySelector('[itemprop="price"], .x-price-primary, [data-testid*="Price" i], [class*="price" i]')?.textContent ?? '');
  return { platform, title: title.replace(/\s*[|–-]\s*(eBay|Poshmark|Mercari|Depop|Etsy).*$/i, '').slice(0, 140), price: ld?.price ?? (metaPrice > 0 ? metaPrice : domPrice) };
}

/** Is this a sold/completed search page? */
export function isSoldPage(url: URL): boolean {
  const p = platformOf(url.hostname);
  const q = url.searchParams;
  if (p === 'ebay') return url.pathname.startsWith('/sch/') && (q.get('LH_Sold') === '1' || q.get('LH_Complete') === '1');
  if (p === 'poshmark') return q.get('availability') === 'sold_out';
  if (p === 'mercari') return /sold_out/.test(q.get('status') ?? '') || q.get('itemStatuses') === '2';
  return false;
}

const CARDS: Partial<Record<Platform, { card: string[]; price: string[] }>> = {
  ebay: { card: ['li.s-card', 'li.s-item', '.srp-results > li'], price: ['.s-card__price', '.s-item__price'] },
  poshmark: { card: ['[data-et-name="listing"]', '.card--small', '.tile'], price: ['.fw--bold', '[class*="price" i]'] },
  mercari: { card: ['[data-testid="ItemContainer"]', '[data-testid="SearchResults"] a[href*="/item/"]'], price: ['[data-testid="ItemPrice"]', '[data-testid*="Price"]', '[class*="price" i]'] },
};

/** Prices of the sold items visible on a sold-results page (strikethrough "was" prices ignored). */
export function readSoldPrices(doc: Document, platform: Platform): number[] {
  const c = CARDS[platform];
  if (!c) return [];
  for (const sel of c.card) {
    const cards = [...doc.querySelectorAll(sel)];
    if (!cards.length) continue;
    const out: number[] = [];
    for (const card of cards) {
      if (/shop on ebay|results matching fewer words/i.test(card.textContent ?? '')) continue;
      let el: Element | null = null;
      for (const ps of c.price) { el = card.querySelector(`${ps}:not(s):not(del)`); if (el) break; }
      const p = parsePrice(el?.textContent ?? '');
      if (p != null) out.push(p);
    }
    if (out.length) return out;
  }
  return [];
}

/** Search URLs for SOLD items on each platform (opened as normal tabs). */
export function soldSearchUrls(query: string): { platform: Platform; label: string; url: string }[] {
  const q = encodeURIComponent(query.trim().slice(0, 100));
  return [
    { platform: 'ebay', label: 'eBay sold', url: `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1` },
    { platform: 'poshmark', label: 'Poshmark sold', url: `https://poshmark.com/search?query=${q}&availability=sold_out` },
    { platform: 'mercari', label: 'Mercari sold', url: `https://www.mercari.com/search/?keyword=${q}&status=sold_out` },
  ];
}

/** A cleaner search query: drop condition/size noise sellers add to titles. */
export function queryFromTitle(t: string): string {
  return t.replace(/\b(nwt|nwot|euc|guc|vguc|new with tags|new without tags|brand new|authentic|rare|vintage|free shipping|bundle|lot of \d+)\b/gi, ' ')
    .replace(/\bsize\s*[a-z0-9.]+\b/gi, ' ').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 8).join(' ');
}
