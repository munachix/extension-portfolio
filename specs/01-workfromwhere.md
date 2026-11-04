# WorkFromWhere: Remote Job Location & Country Checker

## Store listing
- **Name (75 max):** WorkFromWhere: Remote Job Location & Country Checker
- **Summary (132 max):** Instantly see if a "remote" job accepts applicants from your country. Detects US-only, EU-only and time-zone limits.
- **Category:** Productivity → Tools
- **SEO keywords:** remote job location checker, remote jobs worldwide, work from anywhere jobs, us only remote jobs filter, remote job country, remote jobs for africa, remote jobs for asia

## Problem
Many "remote" jobs are really "remote, US only" or "must overlap EST hours." The restriction is often buried at the bottom of the job post. People in Nigeria, India, the Philippines, Pakistan and Latin America waste hours reading and applying to jobs they can't legally take.

## Target user
Remote job seekers outside the US, UK and EU who apply to 20+ jobs a week.

## Competition
- **Remote Job Location Checker** and **GeoJobCheck** (both small).
- **JobGlance** (visa + remote analyzer, AI-based).

**Our edge:** results show up instantly with no AI cost, a clear 3-color badge, support for more job boards, and hiding of jobs you can't take.

## MVP features (free)
1. **Settings:** "I live in: [country]" and "My time zone".
2. **Badge on each job page:**
   - 🟢 Open to your country / worldwide
   - 🔴 Restricted (shows why: "US only", "Must reside in EU")
   - 🟡 Unclear
3. **Highlight the sentence** that caused the result, so the user can check it.
4. **Supported sites:** LinkedIn Jobs, Indeed, We Work Remotely, Remote OK, Wellfound, Greenhouse and Lever job pages.

## Pro features
- Badges on **search result lists** (not just the open job), plus **hide red jobs**.
- Time-zone overlap calculator ("Needs 4h overlap with PST = 5pm–1am for you").
- Saved list of green jobs with export to CSV.
- Custom phrase rules.

## Detection logic (no AI needed)
- A rules engine in `rules.json`: about 300 regex phrases grouped by region.
  - **Restriction phrases:** "only (open to|accepting) candidates (in|from|based in) X", "must (reside|live|be located) in X", "authorized to work in the (US|United States)", "US citizens only", "W-2 only", "EU work permit required".
  - **Worldwide phrases:** "work from anywhere", "worldwide", "any time zone", "global remote".
  - **Time-zone phrases:** "EST/PST/CET hours", "overlap with", "UTC±N".
- Country and region dictionary: "EMEA", "LATAM", "APAC", "North America", "Europe", including ISO names and common short forms.
- **Scoring:** if any restriction excludes the user's country → red. If there's a worldwide phrase and no restriction → green. Otherwise → yellow.

## Tech
- MV3 content scripts per site (`sites/linkedin.js` etc.). Each one returns the job description text and a place to put the badge.
- `MutationObserver` to catch single-page-app navigation (LinkedIn changes pages without reloading).
- **Permissions:** `storage`, plus host permissions only for the listed job sites.
- No server needed.

## File layout
```
manifest.json
core/ (license, settings, paywall)
sites/linkedin.js indeed.js wwr.js remoteok.js wellfound.js greenhouse.js lever.js
engine/rules.json engine/detect.js engine/regions.json
ui/badge.css ui/badge.js options.html popup.html
```

## Acceptance tests
- [ ] A LinkedIn job containing "This role is open to US residents only" shows red with the sentence highlighted.
- [ ] A post containing "We hire worldwide" shows green.
- [ ] A post that mentions no location shows yellow.
- [ ] Badges survive LinkedIn's in-page navigation.

## Risks
- Job sites change their page structure. Keep the code that finds page elements in one file per site so fixes are quick.
- Some false readings are unavoidable. Always show the highlighted sentence so the user can judge.
