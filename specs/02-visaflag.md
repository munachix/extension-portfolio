# VisaFlag: Visa Sponsor Checker – UK, US H-1B, Canada, Netherlands

## Store listing
- **Name:** VisaFlag: Visa Sponsor Checker – UK, US H-1B, Canada, NL
- **Summary:** See if a company sponsors work visas while you browse LinkedIn & Indeed. UK sponsor list, H-1B history, Canada LMIA, Dutch IND.
- **Category:** Productivity → Tools
- **SEO keywords:** visa sponsor checker, uk visa sponsorship jobs, h1b sponsor checker, skilled worker sponsor list, canada lmia employers, netherlands recognised sponsor, visa sponsorship jobs

## Problem
People moving abroad (a huge group in Nigeria, India, Pakistan, the Philippines and elsewhere) apply to companies that can't sponsor a visa. The official sponsor lists are public but stored as huge spreadsheets nobody checks while job-hunting.

## Competition
- **UK only:** UK Visa Sponsor High-lighter, Ultimate UK Visa Sponsor Checker, Sponsor Spotter.
- **US only:** Interstride H-1B Sponsorship Finder (also covers UK), H1B Sponsorer, Jacky Ba.
- **Netherlands only:** Kmatch.

**Gap: no single tool covers all the main destinations.** Our edge: one extension for 4 countries, the user picks their target countries, and matching works on company name variants.

## Data sources (all public, official)
| Country | Dataset | Update frequency |
|---|---|---|
| UK | Register of licensed sponsors: workers (GOV.UK CSV) | Near-daily |
| US | DOL OFLC H-1B LCA disclosure data | Quarterly |
| Canada | Positive LMIA employers list (open.canada.ca) | Quarterly |
| Netherlands | IND public register of recognised sponsors | Regularly |

A GitHub Action downloads each dataset, normalizes the company names and publishes a compact JSON file (`sponsors-{country}.json`, gzipped) to GitHub Pages. The extension downloads the files once a week.

## MVP features (free)
- Badge next to the company name: "✅ UK licensed sponsor (Skilled Worker, A-rated)" / "❌ Not on UK register".
- One country of the user's choice.
- Works on: LinkedIn, Indeed, Glassdoor, Reed, Totaljobs, Seek (Canada).

## Pro features
- All 4 countries at once.
- **US:** number of H-1B filings in recent years and median salary filed.
- **Hide non-sponsors** in search results.
- Search box: type any company name and check it.
- Export the saved sponsor list to CSV.

## Name matching
- Normalize names: lowercase, strip "ltd/limited/inc/llc/plc/gmbh/b.v.", strip punctuation, "&" → "and".
- Exact match first, then a fuzzy match (Jaro-Winkler ≥ 0.93). A fuzzy match shows as "Likely match".
- Show the official registered name so the user can confirm it's the same company.

## Tech
- MV3 content scripts per site, plus a background service worker that refreshes the data weekly.
- Data cached in IndexedDB (the UK list has ~100k rows, about 2–4 MB compressed).
- **Permissions:** `storage`, `alarms`, the job-site hosts, and the GitHub Pages data host.

## Acceptance tests
- [ ] A LinkedIn job at a company on the UK register shows ✅ with route and rating.
- [ ] "Acme Limited" matches "ACME LTD".
- [ ] Data refreshes weekly; the date of the last update is shown in the popup.

## Risks and disclaimer
- Being on a list ≠ the company will sponsor *this* job. Show: "Licensed to sponsor. Always confirm with the employer. Not legal advice."
- If a dataset's format changes, the GitHub Action fails loudly and the extension keeps the last good data.
