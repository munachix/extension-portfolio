# WorkFromWhere

Shows whether a "remote" job accepts applicants from your country, right on the job post: 🟢 open, 🔴 restricted, 🟡 unclear, with the deciding sentence highlighted.

## Try it yourself (about 2 minutes)

1. In this folder's root, run `pnpm build workfromwhere`.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the folder `extensions/workfromwhere/dist`.
5. A settings tab opens. Check that your country and time zone are right.
6. Open any remote job, for example on LinkedIn, SEEK or We Work Remotely. The badge appears above the job description.

**To try Pro:** click the extension icon → paste `TEST-PRO-0000-0000` → **Activate**. This test key only works in the dev build (`dist`). The store build (`dist-prod`, used by `pnpm release`) rejects it.

After changing code, run `pnpm build workfromwhere` again and click the ↻ reload icon on the extension's card in `chrome://extensions`.

## What to check by hand (things the automated tests can't)

- [ ] **LinkedIn, logged in.** LinkedIn hides jobs from logged-out visitors, so its selectors are based on known class names, not a live check. Open a job in the two-pane search view and confirm the badge appears and updates when you click another job.
- [ ] **Indeed** (e.g. `ng.indeed.com`, `uk.indeed.com`, `de.indeed.com`): open a job and check the badge.
- [ ] **StepStone / Totaljobs**: these block automated browsers, so the selectors are unverified. If the badge doesn't appear, the description-finder fallback should still work. Tell me what you see.
- [ ] **"Check this page"** on a company careers page that isn't listed: click the icon → **Check this page**.

## Commands

| Command | What it does |
|---|---|
| `pnpm build workfromwhere` | Dev build → `dist/` (test key works) |
| `pnpm dev workfromwhere` | Dev build, rebuilt on every save |
| `pnpm test workfromwhere` | Unit tests + browser tests |
| `pnpm assets workfromwhere` | Re-render icons, promo tile, screenshots from `store/` |
| `pnpm release workfromwhere` | Store build + `store/listing.md` + `dist/workfromwhere-<version>.zip` |

## Where things are

- `src/engine/`: the detector. **Phrases live in `rules.json`, places in `regions.json`.** Add a phrase or a place there; no code change needed. Then add a test case in `test/engine.test.ts`.
- `../../packages/job-sites/src/adapters.ts`: the page selectors for every job site, shared with future extensions (VisaFlag, HireFill). When a site redesigns, this is the one file to fix.
- `src/content/`: badge, highlighting, search-list pills.
- `store/`: listing text, permission justifications, artwork sources.
- `extension.config.json`: price text, Creem checkout link, product id and license server URL.

## Before the first store upload

1. Create the product in Creem with **license keys** turned on, and deploy the license server (`tools/license-worker/README.md`). Put the checkout URL, product id and license server URL into `extension.config.json`.
2. Replace `support@REPLACE-ME.com` in `sites/landing/`.
3. Publish `sites/landing` (e.g. Cloudflare Pages). The privacy policy URL is `<your-site>/workfromwhere/privacy.html`.
4. Run `pnpm release workfromwhere` and upload `dist/workfromwhere-0.1.0.zip`.
5. After the first upload, put the store item id into `extension.config.json` (`storeExtensionId`) so the "Rate it" button links to the listing, then release a new version.

## Known limitations

- It reads the job post's words. If a post is US-only in practice but never says so, it shows 🟡 unclear.
- English and German phrases are covered. Other languages (French, Dutch, Spanish) only match place names and the location field.
- "Remote" with no place named, e.g. LinkedIn's plain "Remote", stays 🟡 unless the description says more.
- Time-zone limits only turn the badge red when the post gives a range ("UTC-3 to UTC+3", "within 2 hours of CET"). A plain "EST hours" is shown as a note.
