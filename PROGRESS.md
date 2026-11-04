# Progress

_Last updated: 5 November 2026 (pricing + live checks)_

## Built (all tested; draft zips in `dist/`, store zips once the checklist is done)
Pricing revised 5 Nov 2026 after a competitor check: the free tier does the core job with no limit, wherever a competitor gives that away; Pro sells the time-savers.

| Extension | Free | Pro | Competitors' free tier |
|---|---|---|---|
| **HireFill** | Autofill everywhere, no limit; Workday history; Answer Bank; tracker | **$39 once**: AI tailoring + export, cover letters, answers (5 free AI drafts) | Simplify: autofill free; Simplify+ $39.99/mo |
| **VisaFlag** | All 4 countries, badges on job pages + search lists, company search | **$24 once**: US H-1B counts + salaries, hide non-sponsors, shortlist CSV | Several free H-1B badge extensions |
| **FlipComps** | Fee/profit table on 5 platforms; sold summary 10 searches/day | **$5.99/mo or $39 once**: unlimited summaries, price-for-profit, inventory | FlipScout: 3/day free, $14.99/mo or $89 lifetime |
| **ReconFinder** | Duplicates, missing ticks, signs, swapped digits; combinations 3 recs/month | **$9/mo or $79/yr**: combinations everywhere, paste mode, CSV | QBO's discrepancy report (different job) |
| **BorderBatch** | All borders/sizes, 20 photos per batch, ZIP, no watermark | **$12 once**: unlimited, watermark, carousel, saved looks | Free web tools, mostly one photo at a time |
| **WorkFromWhere** | Badge on job posts + search lists, 17 sites, any country | **$19 once**: hide restricted, your time zone, saved jobs, own rules | Small free extensions, LinkedIn only |

Every paywall now says what stays free. One license server serves all six, so **each extension only accepts its own Creem product ids** (`license.productIds`); `pnpm release` refuses a store zip without them.

Live checks on real sites (`tools/live-check/README.md`): Greenhouse dropdowns, LinkedIn country sites and a VisaFlag name match were broken on live pages and are fixed. Still needs your own login or browser: Workday, QBO Reconcile, eBay/Mercari sold pages, logged-in LinkedIn.

Tests: 218 unit + 41 browser, all passing. Shared: job-site readers (17 sites), scorecard (with Creem revenue import), one website (`sites/landing`), release tooling.

## Your launch checklist
1. **Brand + domain.** Replace `BRAND-NAME` and `support@REPLACE-ME.com` in `sites/landing` (`sites/landing/README.md`).
2. **Creem.** One product per price (e.g. FlipComps monthly + FlipComps lifetime) with license keys on. Deploy the license server (`tools/license-worker/README.md`). Put `licenseServerUrl`, `checkoutUrl` and **all** that extension's product ids in `license.productIds` in `extensions/<slug>/extension.config.json`.
3. **Website.** Publish `sites/landing` on Cloudflare Pages with your domain.
4. **VisaFlag data.** Push to GitHub, turn on Pages, run the "VisaFlag data" Action, set `dataBaseUrl`. Download the two US DOL files and run `pnpm visaflag:us …` (see `extensions/visaflag/README.md`).
5. **Live checks (need your logins):** HireFill on a real Workday application; FlipComps on eBay sold results; ReconFinder on a QBO Reconcile screen; VisaFlag/WorkFromWhere on LinkedIn while logged in. Tell me what misses and I'll fix the selectors.
6. `pnpm release <slug>` for each (it stops and tells you if anything above is missing), upload `dist/<slug>-0.1.0.zip`, and paste `store/listing.md` + `store/permissions.md` into the dashboard.
7. Launch day: `pnpm scorecard launch <slug>`; every Monday: the scorecard routine on your own computer (no hosting; see `tools/scorecard/README.md`). Add `CREEM_API_KEY` to `.env` so revenue comes in automatically.

Suggested launch order: HireFill → VisaFlag → FlipComps → ReconFinder → BorderBatch → WorkFromWhere.

## Notes
- This drive (NTFS via macFUSE) creates `._*` files everywhere, including inside `.git`. They're ignored by builds and zips; if git ever complains, run `find .git -name '._*' -delete`. Moving the project to the Mac's internal drive would stop this.
- Before publishing each listing, search the Chrome Web Store for the exact name once more.
