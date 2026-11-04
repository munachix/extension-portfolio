# 10 Chrome Extensions: Portfolio Plan

**Goal:** 10 small paid Chrome extensions, each earning about $50–100/month, for roughly $500–1,000/month in total.
**Strategy:** each extension is found through Chrome Web Store search (no ads needed). Keyword-rich names, one clear job each, and a free tier that leads to paid.

---

## 1. What the research found

- **Almost every good niche already has some competitor.** That's a good sign, because it shows demand. Most of these competitors are small: often under 500 users, few reviews, or abandoned. We win with a sharper name, a cleaner UI, a lower price, privacy (all processing on your computer), and updates.
- **Median Chrome extension = 18 users.** Only about 2.6% of extensions pass 10,000 users ([source](https://konabayev.com/blog/extension-monetization-statistics-2026/)). Getting found in search is everything, which is why the names below lead with the words people type.
- **Paid extensions that work** solve a money or time problem for a group that already spends money. Examples: Closet Tools (~$42K/mo, Poshmark sellers) and GoFullPage (~$10K/mo) ([source](https://extensionpay.com/articles/browser-extensions-make-money)).
- **Specific findings by audience:**
  - **Upwork freelancers:** there are at least 7 tools, from Vollna (4,000 users) and Upwork toolkit (10,000 users) down to many with fewer than 300 users ([source](https://goldmine.muyal.online/blog/best-upwork-chrome-extensions-2026)). The big ones are complex or aimed at agencies, which leaves room for a simple, cheap one for solo freelancers.
  - **Job seekers:** ghost-job detectors are already crowded (GhostJob, Skip This Job, GhostCheck). Visa-sponsor checkers exist mostly one country at a time, UK *or* US. A **multi-country** checker (UK + US + Canada + Netherlands) is the gap. Remote-job "can I apply from my country" checkers exist but are tiny.
  - **Photographers:** good golden-hour tools are phone apps (PhotoPills, Golden Hour One). On desktop there's only the SunCalc website, with no Google Maps overlay. "No-crop border" tools are almost all iPhone apps, with no good desktop batch tool. Used-gear price comparison is done by hand across MPB, KEH and eBay.

---

## 2. The 10 extensions, in build order

| # | Store name (≤75 chars) | Audience | Competition | Price | File |
|---|---|---|---|---|---|
| 1 | WorkFromWhere: Remote Job Location & Country Checker | Remote job seekers outside the US/EU | Low | $4.99/mo or $29 lifetime | `01-workfromwhere.md` |
| 2 | VisaFlag: Visa Sponsor Checker – UK, US H-1B, Canada, NL | People job-hunting abroad | Medium (single-country tools) | $5.99/mo or $39 lifetime | `02-visaflag.md` |
| 3 | GoldenMap: Golden Hour & Sun Planner for Google Maps | Photographers, videographers | Low on desktop | $12 lifetime | `03-goldenmap.md` |
| 4 | BorderBatch: No-Crop Borders & Watermark for Instagram | Photographers, artists | Low on desktop | $12 lifetime | `04-borderbatch.md` |
| 5 | RedFlag Radar: Job & Client Checker for Upwork | Upwork freelancers | High (but complex/pricey rivals) | $4.99/mo | `05-redflag-radar.md` |
| 6 | KeywordFit: Resume Keyword Match & ATS Score | Job seekers | High (Jobscan is $50/mo) | $4.99/mo | `06-keywordfit.md` |
| 7 | FillSnip: Text Templates & Snippets with Fill-in Fields | Freelancers, support, recruiters | High (Text Blaze) | $3.99/mo or $24 lifetime | `07-fillsnip.md` |
| 8 | LensLedger: Used Camera & Lens Price Compare | Photographers buying used gear | Low | $2.99/mo or $19 lifetime | `08-lensledger.md` |
| 9 | ReplyNudge: Client Follow-Up Reminders for Gmail | Freelancers, salespeople | Medium (Boomerang, Gmail's own nudges) | $3.99/mo | `09-replynudge.md` |
| 10 | GigPulse: Gig Rank Tracker for Fiverr | Fiverr sellers | Medium | $4.99/mo | `10-gigpulse.md` |

| 11 | **HireFill: Job Application Autofill & Resume Tailor** (flagship) | All job seekers | High (Simplify), but clear gaps | $39 one-time | `11-hirefill.md` |

> **Updated build order:** see `START-HERE.md` and `12-SCORECARD.md`. They replace the order below.

Order logic: build the low-competition, fast extensions first (1–4) to learn how publishing works, then the crowded but higher-paying ones (5–7), then the riskier ones (8–10).

**Name check:** none of these brand names turned up as an existing Chrome extension in my searches. "SponsorScope" and "VisaMatch" were already taken, so I avoided them. Before publishing each one, search the Chrome Web Store and Google for the exact name one more time.

---

## 3. Naming and SEO rules (so they're found without promotion)

1. **Title = Brand + the exact phrase people search.** Chrome Web Store search weighs the title and summary heavily. Example: "GoldenMap: Golden Hour & Sun Planner for Google Maps".
2. **Trademarks:** write "**for** Upwork / for Fiverr / for Gmail / for Instagram". Never start the name with someone else's brand, never use their logo, and add "Not affiliated with X" in the description. This is how listings stay within Chrome Web Store impersonation rules.
3. **Summary (≤132 chars):** repeat the main keyword plus 1–2 related ones.
4. **Description:** first two lines are a benefit plus the keyword, then a feature list. Use the keyword naturally 3–5 times. No keyword stuffing, because it breaks the spam policy.
5. **Screenshots:** 5 at 1280×800, each with a big caption ("See if a remote job accepts your country").
6. **Landing page per extension** on one shared site (e.g., `yourbrand.com/workfromwhere`). Its title should match the store name. This page ranks on Google and links to the store.
7. **Ratings matter for ranking:** after 3 successful uses, show a polite "Rate us" prompt once. Never gate features behind a review.

---

## 4. Shared tech stack (same for all 10, so each new one is fast)

- **Manifest V3**, plain JavaScript or TypeScript + Vite, no heavy framework (small and fast to review).
- **Shared `core/` folder:** license check, settings page, paywall UI, "rate us" prompt, error logging.
- **Payments: Lemon Squeezy or Polar license keys.** Both pay out to Nigeria. The user buys on a hosted checkout, gets a key, and pastes it into the extension. The extension verifies the key with the provider's API and caches the result for 7 days.
  - ExtensionPay is simpler but runs on Stripe, which isn't available for Nigeria-based accounts. Use it only if you have a Stripe-supported business.
- **Privacy first:** process data on the user's computer and store it in `chrome.storage`. No tracking scripts. Ask for the fewest permissions, which also speeds up Chrome review.
- **Data that changes** (visa sponsor lists etc.): a JSON file hosted free on GitHub Pages or Cloudflare Pages, refreshed by a scheduled GitHub Action.

---

## 5. Launch checklist (per extension)

- [ ] Exact-name check in the Chrome Web Store and Google
- [ ] Privacy policy page (required if you handle any user data)
- [ ] Permission justification text for every permission
- [ ] 5 screenshots + 440×280 promo tile + 128×128 icon
- [ ] Free tier that's useful on its own; paywall on the power features
- [ ] Landing page + post in 2 relevant communities (r/Upwork, r/photography, r/cscareerquestions, Nairaland, etc.)
- [ ] Also publish to the Microsoft Edge Add-ons store (free, same code) for extra search traffic
- [ ] After 30 days: check installs, conversion and reviews. Fix the top complaint.

## 6. Honest expectations

- Plan for some of the 10 to make close to nothing. The portfolio works because 3–4 of them do well.
- Sites like LinkedIn, Upwork and Fiverr change their pages. Budget about 1 hour per extension per month for fixes.
- Never automate actions on a site (auto-apply, auto-bid, auto-message). That gets users banned and extensions removed. All 10 are read-and-help tools only.
