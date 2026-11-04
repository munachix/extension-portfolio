# Scorecard

Tells you, every Monday, which extensions are on track for **$72/month**, which get traffic from Chrome Web Store search on their own, and the **one thing to do next** for each. The rules come from `specs/12-SCORECARD.md`; the thresholds live in `rules.json`, so you can tune them.

## Preview it now (made-up numbers)

```bash
pnpm scorecard --sample
```

Then open `tools/scorecard/dashboard.html` in your browser.

## The day an extension goes live

```bash
pnpm scorecard launch workfromwhere 2026-11-10
```

Leave the date off to use today. Until this is set, the extension shows "Launch it".

## Every Monday (about 10 minutes)

1. Open the Chrome Web Store Developer Dashboard → your extension → **Stats**. Note last week's impressions (store listing views), installs, weekly users and uninstalls, plus the rating and number of ratings.
2. Add them (one line per extension):

   ```bash
   pnpm scorecard add workfromwhere impressions=320 installs=41 weekly_users=150 uninstalls=6 rating=4.6 rating_count=12 hours_spent=1
   ```

   `hours_spent` is how many hours you or I spent on it that week. Add `week=2026-11-02` to fill in an earlier week. Running it again for the same week updates that week.
3. Add revenue, either automatically (step 4) or by hand: `revenue_30d_usd=58 sales_30d=3`.
4. *(Optional)* Pull revenue automatically from Creem: copy `.env.example` to `.env` and paste your Creem API key as `CREEM_API_KEY`. The product ids are read from each `extensions/<slug>/extension.config.json` (`license.productIds`, the same ids the license check uses). Then run:

   ```bash
   pnpm scorecard import-revenue
   ```
5. Run the scorecard and do what the **Action** column says:

   ```bash
   pnpm scorecard
   ```

When you rewrite a listing's title, summary or screenshots, record it. After 2 rewrites with weak traffic, the rules say freeze:

```bash
pnpm scorecard rewrote workfromwhere
```

If the Chrome dashboard lets you download a CSV, you can import it instead of typing. The column names are matched loosely; if it can't read the file, it tells you which headers it found:

```bash
pnpm scorecard import-cws workfromwhere ~/Downloads/stats.csv
```

## What the verdicts mean

| Verdict | Meaning |
|---|---|
| 🟢 Keep | On track. Keep improving; at day 180 with ≥ $72 it's a **winner**: invest. |
| 🟡 Fix | Do the action shown: rewrite the listing, move the paywall/price, or fix a health problem. |
| 🔴 Freeze / Stop | Stop spending time on it. Keep it live; fix it only if it breaks. |
| ⚪ Early | Not launched, or under 30 days old. Keep collecting numbers. |

Health warnings always come first: uninstalls over 40% of installs, a rating under 4.0, or impressions down more than 50% in a week. When any extension passes $300/month, the dashboard tells you to pause new extensions for 2 weeks and grow that one.

## Files

- `data/metrics.csv`: your weekly numbers (you can also edit it in a spreadsheet).
- `data/projects.json`: each extension's launch date, price, rewrite count and product ids.
- `rules.json`: every threshold.
- `dashboard.html`: generated each run; opens offline.

The revenue import was tested against recorded API responses, not your live accounts. If it errors on the first real run, send me the message.

## Where it runs (no hosting needed)

The scorecard is a command plus a static `dashboard.html`. Run it on your own computer each Monday: there is nothing to host, nothing to pay for and nobody else can see your revenue. The data (`data/metrics.csv`) lives in the git repo, so it's backed up when you push to your **private** GitHub repo.

Don't publish `dashboard.html` on the public website: it shows your sales. If you later want to see it on your phone, put it on Cloudflare Pages behind Cloudflare Access (free for up to 50 people); ask me and I'll set it up.

Chrome Web Store stats have no API, so the Monday numbers (impressions, installs, users) are always copied from the Developer Dashboard by hand (or with `import-cws`). That's the 10 minutes.
