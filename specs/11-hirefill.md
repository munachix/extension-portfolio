# HireFill: Job Application Autofill & Resume Tailor (One-Time Payment)

> Flagship product. Goal: the simplest, most reliable job application autofill tool, especially on the portals that others fill badly (Workday, iCIMS, Taleo). **Pay once, use forever.**

---

## 1. Store listing
- **Name (≤75):** HireFill: Job Application Autofill & Resume Tailor
- **Summary (≤132):** Autofill job applications on Workday, Greenhouse, Lever & more. Tailor your CV to each job. One-time payment, no subscription.
- **Category:** Productivity → Tools
- **SEO keywords:** job application autofill, autofill job applications, workday autofill, resume tailor, simplify alternative, job application helper, auto fill job forms, cv tailoring, one time payment
- **Name check:** "ApplyOnce", "ApplyKit", "OneApply", "Job Fill", "Hireeing Autofill" already exist. "HireFill" didn't turn up in my searches. **Confirm in the Chrome Web Store before publishing.**

---

## 2. Why this can win (research)

| Problem in the market | Evidence | Our answer |
|---|---|---|
| **Subscriptions hurt people who are unemployed** | Simplify+ is $19.99/week, $39.99/month or $89.99 per 3 months, with no free trial and no refunds once activated ([Wobo review](https://www.wobo.ai/blog/simplify-review/)) | **$39 once, forever.** Autofill free. |
| **Autofill breaks on big-company portals** | Tested accuracy: Greenhouse ~90%, Lever ~85%, **Workday ~70%, iCIMS ~50%, Taleo ~40%** ([same source](https://www.wobo.ai/blog/simplify-review/)) | Dedicated adapters for each portal, Workday first. Target ≥90% on all five. |
| **AI resume tailoring is buggy or "terrible"** | Users on Reddit and Trustpilot complain; they "edit manually" | **Truth-guard tailoring:** only rephrases and reorders what you actually did. Shows every change; you approve. |
| **Auto-apply bots get accounts flagged** | Review sites warn LinkedIn/Indeed accounts get flagged ([JobRizzer guide](https://jobrizzer.com/guides/best-job-application-autofill-extensions)) | **Fills, never submits.** You always click Submit. |
| **Bloated extensions** | Simplify staff admitted "we definitely bloated the extension" | One button, one side panel, fast. |
| **Privacy worries** | Old privacy policies, data sent to servers | **Everything stays on your computer.** No account needed. |

**How one-time payment works with AI:** Chrome now has free **on-device AI** (Gemini Nano via the Prompt API, stable for extensions since Chrome 138 ([Chrome docs](https://developer.chrome.com/docs/ai/built-in-apis))). We pay no AI server costs, so a one-time price is sustainable.
- If the user's computer can't run it: they can paste their own OpenAI, Gemini or Claude key (optional), or use no-AI mode (autofill still works 100%).

---

## 3. Who it's for
Anyone applying to many jobs: graduates, career changers, laid-off workers, people applying abroad. The UI is in plain language, built for non-technical people.

## 4. Pricing
- **Free, no limit:** autofill on every portal (incl. Workday work history), Answer Bank, tracker + CSV, keyword match. Simplify's autofill is free, so ours must be too (revised Nov 2026).
- **Pro, $39 once:** unlimited AI tailoring + PDF/Word export, cover letters, answer drafts. 5 free AI drafts to try it.
- Payment: Lemon Squeezy or Polar checkout → license key → paste into HireFill. Both pay out to Nigeria.
- **14-day refund, no questions asked.** This builds trust against competitors with no-refund policies.

---

## 5. Features

### 5.1 Setup in 2 minutes
1. Upload your CV (PDF or DOCX). HireFill reads it **on your computer** (pdf.js / mammoth.js) and builds your profile: contact info, work history, education, skills, links.
2. Review the profile on one simple page. Fix anything wrong.
3. Answer 10 common questions once: work authorization, sponsorship needed, notice period, salary expectation, willing to relocate, years of experience, how you heard about us, and the optional demographic questions ("Prefer not to say" by default).

### 5.2 One-click autofill
- On any application page, a floating **"Fill with HireFill"** button appears.
- Fills text fields, dropdowns, radio buttons, checkboxes, dates, phone fields with country codes, and work/education history sections that add one entry at a time. Attaches your CV file automatically.
- **Colors after filling:** 🟢 filled, 🟡 please check (low confidence), 🔴 needs you (we couldn't answer). "Next empty field" button.
- **Never clicks Submit.** On multi-page portals, after you click "Next", HireFill fills the next page automatically.

### 5.3 Supported sites (build order)
1. **Workday** (biggest pain, biggest win)
2. Greenhouse
3. Lever
4. iCIMS
5. Taleo / Oracle Recruiting
6. SmartRecruiters, Ashby, BambooHR, Workable, JazzHR, SuccessFactors
7. LinkedIn Easy Apply, Indeed Apply (fill only)
8. **Any other form:** generic mode, using smart label matching.

### 5.4 Answer Bank (learns from you)
- Each time you type an answer HireFill doesn't know ("Why do you want to work here?", "Describe a challenge…"), it offers to **save it**.
- Next time a similar question appears, it fills your saved answer. Questions are matched by meaning, not exact words: using on-device AI, or fuzzy matching if AI is off.
- Edit or delete saved answers in one list.

### 5.5 CV tailoring for each job (AI)
- Button: **"Tailor my CV to this job."**
- HireFill reads the job description on the page, then:
  - Shows a **match score** and missing keywords (shared engine with KeywordFit).
  - Suggests reworded bullet points and a reordered skills list. **It only uses facts already in your CV.** The truth guard blocks new employers, dates, degrees or numbers that aren't in your profile.
  - Shows **before/after with highlights.** Accept or reject each change.
- Exports the tailored CV as **PDF and DOCX** in 3 clean, ATS-friendly templates. Then it can **attach that tailored version** to the application automatically.
- Saves each tailored version, named `Name_CV_Company_Role.pdf`.

### 5.6 Cover letter and short answers
- **"Write cover letter":** 3 tones (formal / warm / short), based only on your CV and the job post. Editable before inserting.
- **"Help me answer":** drafts an answer to any open question, which you edit before it goes in.

### 5.7 Application tracker (built in, no spreadsheet)
- Every filled application is logged automatically: company, role, link, date, CV version used.
- Status board: Applied → Interview → Offer / Rejected. Follow-up reminders (7 / 14 days).
- Export to CSV.

### 5.8 Privacy and trust
- No account and no server: profile, CVs, answers and tracker all live in `chrome.storage.local` / IndexedDB.
- AI runs on your computer. If you add your own API key, the text goes only to that provider.
- One-click "Delete all my data". Encrypted backup file for moving to a new computer.

---

## 6. How autofill works (technical)

### 6.1 Field understanding pipeline
1. **Collect fields:** every input, select, textarea, contenteditable and ARIA role widget (combobox, listbox, radiogroup), **including inside iframes** (`all_frames: true`, needed for iCIMS and Taleo).
2. **Build a description of each field** from: `<label for>`, `aria-label`, `aria-labelledby`, placeholder, name/id, nearby text, section heading, and portal-specific attributes (Workday `data-automation-id`).
3. **Classify** into ~120 profile keys (`first_name`, `phone_country`, `work[0].title`, `authorized_us`, `salary_expectation`, …) using:
   - (a) portal adapter rules (most accurate)
   - (b) a synonym dictionary, multilingual later
   - (c) on-device AI as a fallback for unknown labels
4. **Fill like a human:** focus → set value through the native setter → dispatch `input`/`change`/`blur` events. This is what React/Angular-based forms need.
5. **Custom dropdowns:** click to open → type to filter → choose the best text match (e.g. "Nigeria" vs "Nigeria (+234)").
6. **File upload:** build a `File` from the stored CV → `DataTransfer` → assign it to `input.files` → dispatch `change`. For drag-drop zones, send a synthetic drop event.
7. **Verify:** re-read each field after filling. If it didn't stick, mark it 🟡.

### 6.2 Portal adapters (one file each)
- `adapters/workday.js`: multi-page flow detection, "Add" buttons for repeated sections, segmented date inputs, the "How did you hear" multi-level selector, prompt-option lists, the account/sign-in page (skip it; the user signs in themselves).
- `adapters/greenhouse.js`, `lever.js`, `icims.js` (iframes), `taleo.js` (legacy forms, iframes), `smartrecruiters.js`, `ashby.js`, `linkedin.js`, `indeed.js`, `generic.js`.
- **Selectors and mappings live in `adapters/*.json`, which can be updated remotely** (signed JSON on GitHub Pages). Fixes ship in hours without waiting for Chrome review.

### 6.3 AI layer (`ai/`)
- `ai/local.js`: Chrome Prompt API (Gemini Nano). Check availability; download the model with a progress bar on first use.
- `ai/byok.js`: OpenAI / Gemini / Anthropic using the user's own key (optional).
- `ai/none.js`: rules-only fallback.
- Prompts are in `ai/prompts/` (tailor, cover letter, answer, classify field). All prompts include **"Use only facts from PROFILE. Never invent."**
- Truth guard: compare entities in the output (companies, dates, numbers, degrees) against the profile. Reject anything new.

### 6.4 Resume export
- Templates in HTML/CSS, then PDF via `chrome.offscreen` plus print-to-PDF via a pdf-lib/jsPDF layout. DOCX via `docx` (npm).
- All templates are single-column with standard headings, which is the most ATS-friendly layout.

### 6.5 Permissions (justify each one in the store listing)
`storage`, `unlimitedStorage` (CV files and versions), `sidePanel`, `scripting`, `activeTab`, `offscreen`, `alarms` (reminders), `notifications`. Host permissions: the known ATS domains by default. "Any site" mode is an optional permission requested only when the user enables generic mode.

### 6.6 File layout
```
manifest.json
background/service-worker.js
content/detector.js  content/filler.js  content/ui-button.js
adapters/workday.js(.json) greenhouse.js lever.js icims.js taleo.js ... generic.js
profile/parser-pdf.js parser-docx.js schema.json
answers/bank.js matcher.js
ai/local.js byok.js none.js prompts/*.txt guard.js
resume/templates/*.html export-pdf.js export-docx.js
tracker/tracker.js
sidepanel/index.html app.js styles.css   (setup, profile, answers, tailor, tracker, settings)
core/license.js paywall.js rate-us.js
```

---

## 7. Build plan

| Phase | Time | Delivers |
|---|---|---|
| 1. Core | Week 1–2 | CV parsing, profile page, generic autofill, Greenhouse + Lever adapters, tracker log |
| 2. Workday | Week 3 | Full multi-page Workday adapter (the key selling point) |
| 3. iCIMS + Taleo + LinkedIn/Indeed | Week 4 | iframe support, remaining big portals |
| 4. AI | Week 5 | Answer Bank matching, CV tailoring with truth guard, cover letters, PDF/DOCX export |
| 5. Launch | Week 6 | License + paywall, store listing, landing page, Edge Add-ons store too |

**Test set:** keep 30 real job application URLs (6 per major portal) and record a fill-accuracy % for each release. Publish the accuracy table on the landing page, because no competitor shows one.

---

## 8. Acceptance tests
- [ ] A new user can go from install to first autofill in under 3 minutes.
- [ ] Workday: fills contact, address, work history (3 entries), education, questions and CV upload across all pages. ≥90% of fields correct.
- [ ] iCIMS form inside an iframe gets filled.
- [ ] Never submits: no click on any Submit/Apply button, enforced by code that blocks it.
- [ ] Tailored CV contains no employer, date or number that isn't in the profile.
- [ ] Works with AI off.
- [ ] No network requests except license check, adapter updates, and (if enabled) the user's chosen AI provider.

## 9. Marketing without ads
- **SEO title** targets "job application autofill" and "Workday autofill", the most-searched pain points.
- **Landing pages:** "Workday autofill", "Simplify alternative one-time payment", "Free resume tailor", "iCIMS autofill".
- **Communities:** r/jobs, r/jobsearchhacks, r/cscareerquestions, r/recruitinghell (helpful posts, not spam), LinkedIn posts, Nairaland jobs section, university career centers.
- **Lifetime deal sites** (later): AppSumo-style listings bring a burst of buyers.

## 10. Risks
- **Portals change their pages:** remote adapter configs + the accuracy test set catch breakage fast.
- **On-device AI needs a fairly powerful computer:** check Chrome's current hardware requirements; fall back to BYOK or no-AI mode automatically.
- **Lifetime price means no recurring revenue:** sustainable because there are no server costs. A paid "v2" upgrade or a cheap "AI credits" add-on can come later if needed.
- **Crowded market** (Simplify, Jobright, Careerflow, JobRizzer, SpeedyApply…): win on the three things they get wrong: **pay once, works on Workday, never invents.**
