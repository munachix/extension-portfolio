# Progress

_Last updated: 5 November 2026_

## Built (all tested, store zips in `dist/`)
| Extension | For | Price | Status |
|---|---|---|---|
| **HireFill** | US job seekers | $39 once (15 free fills) | Built. Greenhouse/Lever structure from live forms; Workday modelled (needs a live test). |
| **VisaFlag** | International job seekers / students in the US | $5.99/mo or $39 | Built. Real UK/NL/Canada data runs; US data needs a quarterly manual download. |
| **FlipComps** | US resellers | $5.99/mo or $39 | Built. eBay sold page modelled (eBay shows a captcha to automation). |
| **ReconFinder** | US bookkeepers (QuickBooks Online) | $9/mo or $79/yr | Built. QBO Reconcile screen modelled (needs a QBO login to verify). |
| **BorderBatch** | Photographers | $12 once | Built and fully verified (offline, no website access). |
| **WorkFromWhere** | Remote job seekers outside the US | $4.99/mo or $29 | Built (first project). |

Shared: Creem licensing via one license server (`tools/license-worker`), job-site readers (17 sites), scorecard (`tools/scorecard`), one website (`sites/landing`), release tooling.

Tests: unit + browser tests for every extension; `pnpm test <slug>`.

## Your launch checklist
1. **Brand + domain.** Replace `BRAND-NAME` and `support@REPLACE-ME.com` in `sites/landing` (`sites/landing/README.md`).
2. **Creem.** One product per extension with license keys on. Deploy the license server (`tools/license-worker/README.md`). Put `licenseServerUrl`, `productId` and `checkoutUrl` into each `extensions/<slug>/extension.config.json`.
3. **Website.** Publish `sites/landing` on Cloudflare Pages with your domain.
4. **VisaFlag data.** Push to GitHub, turn on Pages, run the "VisaFlag data" Action, set `dataBaseUrl`. Download the two US DOL files and run `pnpm visaflag:us …` (see `extensions/visaflag/README.md`).
5. **Live checks (need your logins):** HireFill on a real Workday application; FlipComps on eBay sold results; ReconFinder on a QBO Reconcile screen; VisaFlag/WorkFromWhere on LinkedIn while logged in. Tell me what misses and I'll fix the selectors.
6. `pnpm release <slug>` for each, upload `dist/<slug>-0.1.0.zip`, and paste `store/listing.md` + `store/permissions.md` into the dashboard.
7. Launch day: `pnpm scorecard launch <slug>`; every Monday: the scorecard routine.

Suggested launch order: HireFill → VisaFlag → FlipComps → ReconFinder → BorderBatch → WorkFromWhere.

## Notes
- This drive (NTFS via macFUSE) creates `._*` files everywhere, including inside `.git`. They're ignored by builds and zips; if git ever complains, run `find .git -name '._*' -delete`. Moving the project to the Mac's internal drive would stop this.
- Before publishing each listing, search the Chrome Web Store for the exact name once more.
