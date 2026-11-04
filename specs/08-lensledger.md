# LensLedger: Used Camera & Lens Price Compare

## Store listing
- **Name:** LensLedger: Used Camera & Lens Price Compare
- **Summary:** Viewing a used lens on MPB, KEH or eBay? See prices at the other stores instantly + your price history & drop alerts.
- **Category:** Shopping
- **SEO keywords:** used lens price, used camera price compare, mpb vs keh, used camera gear prices, lens price tracker, camera price drop alert

## Problem
Photographers buying used gear open MPB, KEH, eBay, Adorama Used and B&H Used in five tabs to compare the same lens by hand. Price-tracking services exist (CanonPriceWatch, PageCrawl), but nothing compares stores on the page you're already looking at.

## Competition
CanonPriceWatch (Canon-focused blog/site), PageCrawl (generic page monitor), MPB's own Price Index.

**Our edge:** one compare panel on the product page, covering all brands.

## MVP (free)
- On a product page at MPB, KEH, eBay, B&H or Adorama: detect the product model (from the title and structured data).
- Side panel with **"Search this at…"** links that open pre-filled searches at the other stores (zero scraping: just search URLs).
- Notes the price you saw today → **your personal price history** (stored on your computer).

## Pro ($2.99/mo or $19 lifetime)
- **Live prices** from the other stores in the panel (background fetch of their search results, cheapest per condition grade).
- Price drop alerts on a watchlist (`chrome.alarms` checks every 6h).
- Condition grade translator (MPB "Excellent" ≈ KEH "EX+", etc.).

## Tech
- Model detection: parse JSON-LD `Product` data where it exists, else the page title. Normalize terms like "RF 24-70mm f/2.8L IS USM".
- **Permissions:**
  - Free: `storage`, the 5 store hosts.
  - Pro: same hosts, plus `alarms` and `notifications`.

## Acceptance tests
- [ ] On the MPB page for "Sony FE 24-70mm f/2.8 GM II", the search links for the 4 other stores open correct results.
- [ ] Watchlist alert fires when the price drops (use a test store fixture).

## Risks
- Fetching other stores' pages can break or be blocked. That's why the free tier uses links only and live prices are a "best effort" Pro feature.
- Check each store's terms; slow down request rates. Later, consider affiliate programs (MPB, KEH, eBay Partner Network) for extra revenue.
