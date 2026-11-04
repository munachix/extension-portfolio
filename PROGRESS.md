# Progress

_Last updated: 5 November 2026_

## Done
- **Step 1: Monorepo** (pnpm workspaces, TypeScript, Vite).
  - `packages/core`: Lemon Squeezy + Polar license keys behind one `verifyLicense()`, 7-day cache, 14-day offline grace, dev-only test key; rate-us prompt after the 3rd success; CSV export.
  - `packages/ui`: design tokens + upgrade box.
  - `packages/job-sites`: page readers for **17 job sites** (added at your request: SEEK AU/NZ, StepStone, Totaljobs, Reed, XING, JOIN, Personio, Recruitee, Ashby, Workable, SmartRecruiters), plus a JSON-LD reader and a generic fallback. VisaFlag and HireFill will reuse this.
  - `packages/testing`: Playwright harness that blocks all real network.
  - `tools/release`: `pnpm build | dev | test | assets | release <slug>`. Release fails if a store limit is exceeded.
- **WorkFromWhere MVP + Pro**: complete.
  - Engine: 185+ countries, 32 regions, English **and German** phrases, Australia/NZ work-rights wording, time-zone bands.
  - Free: badge + highlighted sentence on job pages, "Check this page" on any site.
  - Pro: list badges + hide restricted, local-time conversion, saved jobs + CSV, custom phrase rules.
  - Tests: 72 unit + 9 browser tests, all passing. Store build verified to reject the test key.
  - Store kit: `dist/workfromwhere-0.1.0.zip`, `store/listing.md`, `store/permissions.md`, icon, promo tile, 5 screenshots.
  - Landing page + privacy policy in `sites/landing/workfromwhere/`.

- **Step 2: Scorecard** (`tools/scorecard`): weekly numbers in `data/metrics.csv`, keep/fix/kill rules from the spec with thresholds in `rules.json`, health flags, revenue-per-hour and winner rules, terminal table + offline `dashboard.html` (light/dark, trend charts with hover, table view). Commands: `add`, `launch`, `rewrote`, `import-revenue` (Lemon Squeezy/Polar), `import-cws`, `--sample`. 32 tests. See `tools/scorecard/README.md`.

## Next
1. **You:** load `extensions/workfromwhere/dist` in Chrome and run the manual checks in `extensions/workfromwhere/README.md` (LinkedIn logged in, Indeed, StepStone).
2. **You:** Lemon Squeezy product with license keys → paste checkout URL + product id into `extension.config.json`. Support email. Publish `sites/landing`.
3. **Me:** VisaFlag (reuses `packages/job-sites`), then HireFill Phase 1.
4. **You, from launch day:** `pnpm scorecard launch workfromwhere`, then the 10-minute Monday routine in `tools/scorecard/README.md`.

## Blockers / decisions for you
- **LinkedIn and StepStone selectors are unverified on live pages** (LinkedIn needs a login; StepStone blocks automated browsers). The generic fallback covers them, but please test by hand.
- **Price:** the spec says $4.99/mo or $29 lifetime. Given the research (low willingness to pay in this niche), consider a lifetime-only price of $9–15. It's one line in `extension.config.json`.

## Notes
- This drive (NTFS via macFUSE) creates `._*` files. They're git-ignored and excluded from tests, builds and zips.
