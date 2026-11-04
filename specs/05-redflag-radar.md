# RedFlag Radar: Job & Client Checker for Upwork

## Store listing
- **Name:** RedFlag Radar: Job & Client Checker for Upwork
- **Summary:** Score every Upwork job before you spend Connects. Spot bad clients: unverified payment, low hire rate & low pay.
- **Description must include:** "Not affiliated with Upwork."
- **Category:** Productivity → Workflow
- **SEO keywords:** upwork job filter, upwork client checker, save upwork connects, upwork job score, upwork red flags, upwork extension

## Problem
Freelancers pay for Connects (Upwork's paid credits for applying) and waste them on jobs from clients who never hire, pay badly, or already have 50+ proposals. The warning signs are on the page but scattered.

## Competition
- **Vollna / Upwork Copilot** (4k users): powerful, but complex and aimed at agencies.
- **Upwork toolkit** (10k users): alerts + AI cover letters.
- **Freelancer Client Filter, UpKit, Upwork Job Tracker, Upwork Goldmine, Upwork Ghost Buster:** small.

**Our edge:** *one* job only, a simple 0–100 score with plain-English reasons, beginner-friendly, cheap, and no automation (safe for your account).

## MVP (free)
- On a job page, a score card at the top:
  - Payment verified? Client spend, hire rate, average hourly rate paid, reviews, member since.
  - Proposals count, "last viewed by client", interviewing count, invites sent.
  - Budget vs your minimum rate (set in settings).
- Score 0–100 + 🟢/🟡/🔴 + the top 3 reasons ("Client hired 1 of 14 jobs").
- **Connects cost converted to $** (at Upwork's current price per Connect; keep it configurable).

## Pro ($4.99/mo)
- Score badges on the **search results list** + hide jobs under X score.
- Your own weights ("I care most about hire rate").
- **Connects ROI log:** record proposals sent → viewed → interview → hired; see which job types pay off.
- Client blocklist / notes.

## Scoring (starting weights, tune with users)
| Signal | Weight |
|---|---|
| Payment verified | 15 |
| Hire rate | 20 |
| Total spend | 15 |
| Avg hourly paid vs your rate | 15 |
| Proposals count (fewer = better) | 15 |
| Client rating | 10 |
| Job posted < 24h | 10 |

## Tech
- Content script on `https://www.upwork.com/*`. It reads the page the user is already viewing. **No background scraping, no automated actions.**
- Page selectors are kept in `selectors.json`, which can be updated remotely, so fixes don't need a new Chrome review.
- **Permissions:** `storage`, host `upwork.com`.

## Acceptance tests
- [ ] The score card appears in under 1s on a job details page.
- [ ] A job with an unverified payment method + 0 hires scores below 40.
- [ ] The extension works after Upwork's in-page navigation.

## Risks
- **Upwork's terms:** never automate bidding, messaging or scraping beyond the current page. Say "Not affiliated with Upwork."
- The page layout changes often. The remote selectors file reduces downtime.
