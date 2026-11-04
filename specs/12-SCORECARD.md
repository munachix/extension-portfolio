# The Success System: Scorecard, $72 Benchmark & Keep/Kill Rules

**Benchmark:** each extension should reach **$72/month** (the median subscription app after year 1, per RevenueCat's 2026 report). 11 extensions × $72 ≈ **$790/month**.
**Rule #1:** we only invest time in extensions that get **traffic on their own** from Chrome Web Store search.

---

## Part A: Pre-launch score (which to build first)

Each project is scored 1–5 on six factors, then weighted:

| Factor | Weight | What 5 means |
|---|---|---|
| **D: Organic demand** | 25% | Competitors in this space have 10k+ users, so people already search for it |
| **C: Beatable competition** | 20% | Rivals are tiny, abandoned, or overpriced |
| **W: Willingness to pay** | 20% | Users already pay for tools like this |
| **B: Build speed** | 10% | Shippable in under 1 week |
| **R: Low platform risk** | 15% | Doesn't depend on a site that changes or blocks us |
| **S: Synergy** | 10% | Shares code or audience with our other extensions |

### Demand evidence (Chrome Web Store, checked Nov 2026)
| Niche | Competitor → users |
|---|---|
| Job autofill | **Simplify Copilot → 600,000** (listing; claims 1M+), JobGlance → 2,000 |
| Visa sponsor | **Ultimate UK Visa Sponsor Checker → 10,000**, Interstride H-1B → 4,000, UK Visa Sponsor High-lighter → 20 |
| Upwork tools | Upwork toolkit → 10,000, Vollna → 4,000, UpKit → 154 |
| Remote location | Remote Job Location Checker → 33 (not updated since 2024) |
| Resume matcher | Resume Matcher – ATS Score → 14 (Jobscan itself is a big brand) |
| Fiverr rank | GigRank → ~63–66 |
| Golden hour | Golden Hour Calculator → 1 rating (tiny) |
| Watermark | Watermarkly → ~200k monthly website visitors |
| Text expander | Text Blaze → very large (market leader) |

### Scores
| Rank | Project | D | C | W | B | R | S | **Score /5** | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **HireFill** (job autofill) | 5 | 3 | 4 | 2 | 2 | 5 | **3.65** | 🟢 Build: flagship |
| 2 | **VisaFlag** | 4 | 3 | 3 | 4 | 4 | 4 | **3.60** | 🟢 Build |
| 3 | **WorkFromWhere** | 3 | 5 | 2 | 5 | 3 | 4 | **3.50** | 🟢 Build: quick win |
| 4 | **BorderBatch** | 3 | 4 | 2 | 5 | 5 | 3 | **3.50** | 🟢 Build: quick win |
| 5 | **GoldenMap** | 2 | 5 | 2 | 5 | 5 | 3 | **3.45** | 🟡 Build, low effort |
| 6 | KeywordFit | 3 | 2 | 3 | 4 | 4 | 5 | 3.25 | 🟡 Build after HireFill (reuses its engine) |
| 7 | FillSnip | 5 | 1 | 3 | 3 | 4 | 3 | 3.25 | 🟡 Later; target "template pack" keywords |
| 8 | RedFlag Radar | 4 | 2 | 4 | 4 | 2 | 3 | 3.20 | 🟡 Later |
| 9 | LensLedger | 2 | 4 | 2 | 3 | 2 | 2 | 2.50 | 🔴 Park |
| 10 | ReplyNudge | 3 | 2 | 2 | 4 | 2 | 2 | 2.45 | 🔴 Park |
| 11 | GigPulse | 2 | 3 | 3 | 3 | 1 | 2 | 2.35 | 🔴 Park (low demand, high ban risk) |

**Rough revenue at month 6** (estimate, not a promise):
- **HireFill:** 300–1,000 installs/mo × 3% buy × $39 ≈ **$350–1,170/mo**
- **VisaFlag:** ≈ $60–200/mo
- **WorkFromWhere, BorderBatch, GoldenMap:** ≈ $20–100/mo each
- **Parked ones:** likely under $36/mo

---

## Part B: Post-launch tracking (the real test)

The pre-launch score is a guess. **Real numbers decide.** Every Monday, record for each extension:

| Metric | Where to get it | Why it matters |
|---|---|---|
| **Store impressions** (listing views) | Chrome Web Store Developer Dashboard → Stats | **Self-traffic**: how often Chrome search shows us |
| **Installs** | Dashboard → Stats | Is the listing convincing? |
| **Install rate** = installs ÷ impressions | calculated | Title, screenshots and rating quality |
| **Weekly active users** | Dashboard → Stats | Do people keep it? |
| **Uninstalls** | Dashboard | A high number means broken or confusing |
| **Revenue (30 days)** | Lemon Squeezy / Polar dashboard or API | **The $72 test** |
| **Paid conversion** = sales ÷ installs | calculated | Is the paywall in the right place? |
| **Rating + review count** | Store listing | Drives search ranking |
| **Hours spent this week** | your own log | Revenue per hour |

### Self-traffic score (organic traffic)
- 🟢 **Strong:** ≥ 500 impressions/week by week 8 with zero promotion
- 🟡 **Medium:** 150–500/week
- 🔴 **Weak:** < 150/week. Chrome search isn't sending people, so the name or keywords are wrong, or the demand isn't there.

### The $72 rules (keep / fix / kill)

| Checkpoint | 🟢 Keep and invest | 🟡 Fix | 🔴 Kill / freeze |
|---|---|---|---|
| **Day 30** | ≥ 100 installs and ≥ 1 sale | Few installs: rewrite title, summary and screenshots | — (too early) |
| **Day 90** | Revenue ≥ **$36/mo** (half the target) OR ≥ 500 weekly users | Traffic OK but no sales: move the paywall or change the price | < 150 impressions/week after 2 listing rewrites → **freeze** |
| **Day 180** | Revenue ≥ **$72/mo** → "Winner": add features, translate the listing, Edge store | $36–72 → one more improvement cycle | < $36/mo → **stop work**. Keep it live and fix only if it breaks. |

**Revenue per hour rule:** if an extension needs more than 4 hours/month of fixes and makes under $72, it's costing more than it earns. Freeze it.

**Winner rule:** when one extension passes $300/mo, pause new extensions for 2 weeks and grow the winner (more features, more languages, more landing pages).

### Health flags (check weekly)
- Uninstalls > 40% of installs → something is broken or confusing.
- Rating < 4.0 → read every review and fix the top complaint first.
- Impressions dropped > 50% week over week → check if the listing got flagged or a competitor launched.

---

## Part C: Dashboard
Claude Code will build a small **scorecard tool** (see `CLAUDE-CODE-PROMPT.md`):
- Weekly numbers go in a CSV (or come from the Lemon Squeezy / Polar API).
- It shows every extension as 🟢/🟡/🔴 against $72, its self-traffic level, and an action ("rewrite listing", "freeze", "invest").
