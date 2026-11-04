# GigPulse: Gig Rank Tracker for Fiverr

## Store listing
- **Name:** GigPulse: Gig Rank Tracker for Fiverr
- **Summary:** Track where your Fiverr gigs rank for your keywords. See rank history, competitor prices & reviews. Not affiliated with Fiverr.
- **Category:** Productivity → Workflow
- **SEO keywords:** fiverr gig rank, fiverr rank checker, fiverr seo, fiverr gig ranking, fiverr keyword tracker, fiverr seller tools

## Problem
Fiverr sellers (many in Nigeria, Pakistan, India and Bangladesh) obsess over where their gig appears in search, but checking by hand means scrolling pages of results for each keyword, every day.

## Competition
GigRank, Fiverr Gig Ranking Checker, Fiverr SEO Analyzer, Fiverr Seller Assistant, RankMyGig.

**Our edge:** **rank history charts** (most rivals show only the current rank), competitor snapshot, and a clean UI.

## MVP (free: 1 gig × 3 keywords)
- Add your gig link + keywords.
- **While you browse Fiverr search results**, the extension finds your gig's position and logs it with the date. It reads only the pages you open, with no automated crawling.
- "Check now" button opens the search for each keyword in a tab, logs your position, then closes the tab. The user triggers it, at a normal browsing pace.
- Shows the current rank and change since last check.

## Pro ($4.99/mo)
- 10 gigs × 10 keywords, **history chart** (30/90 days).
- Competitor snapshot for a keyword: top 10 gigs' starting price, reviews and seller level, plus your position among them.
- Highlight your gig on search pages + note rank changes after you edit a gig.
- Export to CSV.

## Tech
- Content script on `https://www.fiverr.com/*`. Parse gig cards in search results (selectors kept in a remote config).
- History in IndexedDB; small SVG charts drawn by our own code (no chart library).
- **Permissions:** `storage`, `tabs` (for check now), host `fiverr.com`.

## Acceptance tests
- [ ] Your gig on page 2, position 5, is logged as rank 29 (with 24 gigs per page; detect the actual page size).
- [ ] History chart renders 30 data points.
- [ ] No background requests happen without the user clicking.

## Risks
- **Fiverr has strong bot protection and terms against scraping.** Keep everything user-triggered and at a normal pace; never automate gig actions.
- Search results are personalized, so tell users the ranks are "as seen from your account."
- Ranked last of the 10 for this reason.
