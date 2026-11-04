# VisaFlag

Shows next to the company name on LinkedIn, Indeed, Glassdoor, Reed and Totaljobs whether that company is on the official visa-sponsor list of the **US (H-1B), UK, Canada or the Netherlands**.

## Try it

1. `pnpm build visaflag`, then in `chrome://extensions` → Developer mode → **Load unpacked** → `extensions/visaflag/dist`.
2. The extension needs the sponsor data online (step "Data" below). Until then the badges say "No data".
3. Pro test key (dev build only): `TEST-PRO-0000-0000`.

## Data

Built by `pipeline/build.mjs` from official sources and published to GitHub Pages by `.github/workflows/visaflag-data.yml` every Monday.

| Country | Source | Refresh |
|---|---|---|
| UK | GOV.UK register of licensed sponsors (CSV) | Automatic, weekly |
| Netherlands | IND public register, Work (web table) | Automatic, weekly |
| Canada | open.canada.ca positive LMIA employers, last 4 quarters (Excel) | Automatic, weekly |
| US | DOL LCA disclosure data, H-1B (Excel) | **Manual, 4× a year** (DOL refuses automated downloads) |

Real run on 5 Nov 2026: UK 127,638 sponsors (1.7 MB), NL 13,089 (0.2 MB), Canada 26,472 (0.3 MB).

### Turning on the weekly refresh (once)
1. Push this repo to GitHub.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Actions → "VisaFlag data" → **Run workflow**.
4. Put `https://<your-user>.github.io/<repo>/visaflag` into `extension.config.json` → `dataBaseUrl`, and add the same URL as a repo variable `VISAFLAG_DATA_URL` (Settings → Secrets and variables → Actions → Variables), so a broken source falls back to last week's data.

If a government site changes its format, that country keeps its last good data and the Action run turns red, so you get GitHub's failure email.

### US data, 4 times a year (Feb, May, Aug, Nov)
1. In your browser, open https://www.dol.gov/agencies/eta/foreign-labor/performance → **LCA Programs (H-1B, H-1B1, E-3)** and download the newest `LCA_Disclosure_Data_FY…_Q….xlsx` and the previous year's Q4 file. Keep the file names.
2. Run:
   ```bash
   pnpm visaflag:us ~/Downloads/LCA_Disclosure_Data_FY2026_Q3.xlsx ~/Downloads/LCA_Disclosure_Data_FY2025_Q4.xlsx
   ```
3. Commit `extensions/visaflag/pipeline/data/sponsors-us.json.gz`. The next weekly run publishes it.

## Matching

`src/match/matcher.ts` matches page names to register names: exact after removing "Ltd/Inc/B.V." etc.; **likely** when only country words differ ("Google" ↔ "Google (UK) Limited"), when the registered name starts with the brand ("Barclays" ↔ "Barclays Bank PLC"), or by Jaro-Winkler ≥ 0.93. Likely matches always show the registered name.

## Hand checks still needed
- LinkedIn while logged in, Glassdoor, Reed and Totaljobs: the company-name selectors in `packages/job-sites/src/adapters.ts` are unverified on live pages (logins/bot checks).
- The US pipeline has been tested on sample data with DOL's published column names, not yet on a real DOL file.
