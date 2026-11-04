# Prompt for Claude Code

Copy everything below the line into Claude Code, opened in an empty folder that contains the unzipped `specs/` folder.

---

You are my lead engineer. We're building a **portfolio of paid Chrome extensions** (Manifest V3) and a **success-tracking system** that tells us which extensions earn at least **$72/month** and which get organic traffic from Chrome Web Store search.

## Read first
1. `specs/00-README.md`: overall strategy, shared stack, naming/SEO rules
2. `specs/12-SCORECARD.md`: scoring model, metrics, keep/fix/kill rules
3. `specs/START-HERE.md`: build order
4. Each extension's spec (`specs/01-…` to `specs/11-…`) **before** you build that extension

Treat the specs as requirements. If something in a spec is technically wrong or outdated (APIs change), tell me, propose the fix, and continue.

## Non-negotiable rules (all extensions)
- **Manifest V3**, TypeScript, Vite build. No heavy UI framework unless a spec needs it (Preact is fine for side panels).
- **Privacy:** process data on the user's device. No analytics or tracking SDKs. No remote code. Remote **JSON config only**: selector maps, datasets.
- **Least permissions:** only what the spec lists. Optional permissions where possible. Write a one-line justification for each in `store/permissions.md`.
- **Never automate actions on third-party sites:** no auto-submit, auto-apply, auto-bid, auto-message. Enforce this in code for HireFill: the filler must refuse to click submit/apply buttons.
- Brand names of other companies only in the form "for Upwork / for Gmail" plus "Not affiliated with X".
- Free tier must be useful. Paywall on power features only.

## Step 1: Monorepo setup
Create this structure with pnpm workspaces:
```
/packages/core        # shared: license, paywall UI, settings, rate-us prompt, storage helpers, remote-config loader, i18n
/packages/ui          # shared CSS tokens, badge, side-panel shell, toast
/packages/testing     # Playwright helpers to load an unpacked extension + local HTML fixtures
/extensions/<slug>    # one folder per extension (slug from the spec file name)
/tools/scorecard      # success-tracking system (Step 2)
/tools/release        # build + zip + store-asset generator
/sites/landing        # one static site: a landing page + privacy policy per extension
/specs                # the spec MDs (already present)
```
- **`packages/core/license`:** support **Lemon Squeezy** and **Polar** license keys behind one interface `verifyLicense(key) → {valid, plan, expiresAt}`. Cache valid results for 7 days in `chrome.storage.local`, with an offline grace period. Provider and product IDs come from each extension's config.
- **`packages/core/rate-us`:** show once, after the 3rd successful use, with a link to the store listing.
- **`tools/release`:** `pnpm release <slug>` → production build → `dist/<slug>-<version>.zip` ready for Chrome Web Store upload. Also generate `store/listing.md` (name ≤75 chars, summary ≤132 chars, description, keywords) from the spec. Fail if the character limits are exceeded.
- Root scripts: `pnpm dev <slug>`, `pnpm test <slug>`, `pnpm release <slug>`, `pnpm scorecard`.

## Step 2: Build the success-tracking system (`/tools/scorecard`)
A local tool (Node CLI + a single static HTML dashboard, no server needed):
1. **Data file:** `tools/scorecard/data/metrics.csv` with columns
   `week_start, slug, impressions, installs, weekly_users, uninstalls, revenue_30d_usd, sales_30d, rating, rating_count, hours_spent`.
   I'll paste numbers from the Chrome Web Store Developer Dashboard weekly. Also accept a dashboard CSV export if the format can be parsed.
2. **Optional revenue import:** `pnpm scorecard import-revenue` pulls the last 30 days of orders per product from the Lemon Squeezy and/or Polar API (API keys in `.env`, never committed) and fills `revenue_30d_usd` and `sales_30d`.
3. **Projects file:** `tools/scorecard/data/projects.json`: slug, name, launch date, price model, the pre-launch factor scores from `12-SCORECARD.md`.
4. **Calculations per extension:** install rate, paid conversion, uninstall %, revenue per hour, week-over-week change, days since launch.
5. **Rules engine:** implement exactly the keep/fix/kill table, self-traffic thresholds (🟢 ≥500 / 🟡 150–500 / 🔴 <150 impressions per week by week 8), health flags, revenue-per-hour rule and winner rule from `12-SCORECARD.md`. Put thresholds in `rules.json` so I can tune them.
6. **Output:**
   - `pnpm scorecard` prints a table: extension, status 🟢/🟡/🔴 vs **$72**, self-traffic level, and the **one recommended action** ("Rewrite title & screenshots", "Move paywall", "Freeze", "Invest: add features").
   - Also writes `tools/scorecard/dashboard.html` (self-contained, opens offline) with: portfolio total vs $72 × number of live extensions, per-extension cards, 12-week trend charts for impressions/installs/revenue.
7. Unit tests for every rule using sample data.

## Step 3: Build the extensions in this order
Follow `START-HERE.md`:
1. `01-workfromwhere`: complete MVP + Pro, tests, release zip, landing page.
2. `11-hirefill`: build **phase by phase** as in its spec section 7. After each phase, stop and give me a short report + how to load and test it myself.
3. `02-visaflag`: including the GitHub Action that downloads and normalizes the official datasets.
4. `04-borderbatch`, then `03-goldenmap`.
5. Wave 3 only when I say so.

## Definition of done (each extension)
- [ ] All acceptance tests in its spec pass (Playwright with local HTML fixtures that copy the real page structure; never hit live sites in CI)
- [ ] `pnpm release <slug>` produces the zip and `store/listing.md`
- [ ] `store/permissions.md` justifications + privacy policy page in `/sites/landing`
- [ ] Screenshot templates: 5 × 1280×800 HTML mockups rendered with Playwright, plus a 440×280 promo tile and a 128×128 icon
- [ ] Free/Pro gating works with a test license key
- [ ] Entry added to `tools/scorecard/data/projects.json`
- [ ] A short `extensions/<slug>/README.md`: how to test manually, known limitations

## How to work with me
- I'm not a deep technical person. Explain steps simply, and tell me exactly what to click when I need to do something (load unpacked, upload to the store, create a Lemon Squeezy product).
- Before big architectural choices, give me 2 options and a recommendation.
- Commit after each working step with clear messages.
- At the end of each session, update `PROGRESS.md`: what's done, what's next, any blockers.

Start with Step 1 now.
