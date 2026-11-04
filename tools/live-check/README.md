# Live checks

Fixture tests prove the logic; these prove the extensions work on the **real** sites today. They load the dev build in a fresh Chromium and open real public pages. Nothing is ever submitted.

```bash
pnpm build hirefill
```
```bash
node tools/live-check/hirefill.mjs https://job-boards.greenhouse.io/<company>/jobs/<id> https://jobs.lever.co/<company>/<id>/apply
```
```bash
node tools/live-check/badges.mjs workfromwhere https://www.linkedin.com/jobs/view/<id> --country NG
```
```bash
node tools/live-check/badges.mjs visaflag https://uk.linkedin.com/jobs/view/<id> --data extensions/visaflag/pipeline/out
```
```bash
node tools/live-check/panel.mjs flipcomps https://poshmark.com/listing/<id>
```

Sites that show bot checks to automated browsers (eBay, Mercari, Etsy, Indeed, Glassdoor, USCIS) are not worked around. Check those in your own Chrome with the unpacked extension. Workday, QuickBooks and logged-in LinkedIn need your own login.

## Results, 5 Nov 2026

| Where | Result | Fixed |
|---|---|---|
| Greenhouse (new job-boards design, Anthropic form) | Text fields filled, but **every dropdown failed** and it took 19 s: HireFill read the page's hidden phone-country list and its events didn't open the real react-select | Full pointer sequence; options read per dropdown; hidden helper inputs skipped. Now 13 filled in 1.6 s: country, both visa questions = No, relocation, gender/ethnicity/veteran declined |
| Lever (Palantir form) | 11 filled; "Name pronunciation" got the full name; university and "how did you hear" missed | Pronunciation left to you; "University of Texas at Austin" = "University of Texas - Austin"; "Company website" → "Palantir Website". Now 12 filled, authorized = Yes, sponsorship = No, consent left to you |
| LinkedIn public job page (www) | WorkFromWhere: correct red badge on a US-only job | |
| LinkedIn country sites (uk.linkedin.com) | **No badge at all** (VisaFlag and WorkFromWhere only matched www.linkedin.com) | Matches every LinkedIn country site |
| VisaFlag on JPMorganChase (UK) | Said "not listed" (LinkedIn writes it as one word) | Spacing-insensitive match → "Likely sponsor" (JPMorgan Chase Bank, N.A.) |
| Poshmark listing | FlipComps panel and fees correct | |
| eBay / Mercari sold pages | Blocked by the site's bot check (403) | Check in your Chrome |
