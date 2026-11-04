# KeywordFit: Resume Keyword Match & ATS Score

## Store listing
- **Name:** KeywordFit: Resume Keyword Match & ATS Score
- **Summary:** Compare your resume to any job post in one click. See match score & missing keywords on LinkedIn, Indeed & more. Private.
- **Category:** Productivity → Tools
- **SEO keywords:** resume keyword match, ats score, resume scanner, jobscan alternative, ats resume checker, cv keyword checker, job description match

## Problem
Applicant tracking systems (ATS, the software companies use to filter resumes) screen out resumes missing key terms. Jobscan, the best-known checker, costs about $50/month, which job seekers often can't afford. Free tools have heavy limits or upload your resume to their servers.

## Competition
- **Jobscan** (expensive), **Teal**, **Jobalytics**, **ATStruggle Buster**, **Resume Matcher**, **FitToHire**, and many others (crowded).

**Our edge:** about 10× cheaper than Jobscan, **all on your computer (resume never leaves it)**, instant results, and a clean "add these 5 keywords" list.

## MVP (free, 5 checks/day)
- Upload your resume once (PDF/DOCX/TXT). The text is extracted on your computer and stored in `chrome.storage.local`.
- On a job page: a button **"Check fit"** → shows:
  - Match % (hard skills weighted ×2, tools, soft skills, job title).
  - **Missing keywords** (ranked by how often the job post repeats them).
  - Found keywords (green).

## Pro ($4.99/mo)
- Unlimited checks, multiple resumes (choose per job).
- Results shown automatically on every job page.
- History: jobs checked + score, exportable.
- "Copy missing keywords" + suggested phrasing using keyword templates (no AI cost). An AI rewrite can be added later with the user's own API key.

## Matching engine
- A skills dictionary of about 8,000 terms (tech, finance, healthcare, marketing, and more), plus synonyms ("JS" = "JavaScript").
- Extract n-grams (1–3 words) from the job post → keep the ones in the dictionary + capitalized multi-word terms → weight by frequency and section (requirements section > about us).
- Score = weighted found / weighted total.
- PDF text via **pdf.js**, DOCX via **mammoth.js**, both bundled with the extension.

## Supported sites
LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, Wellfound.

## Tech and permissions
- `storage`, `activeTab`, `scripting`. Host permissions are optional and requested only for auto mode.

## Acceptance tests
- [ ] A job post listing "Python, SQL, Tableau" plus a resume with Python only → shows SQL and Tableau as missing.
- [ ] A 2-page PDF resume is parsed in under 2s.
- [ ] Nothing is sent over the network (verify in DevTools).

## Risks
- Crowded market, so win on price, privacy and search ranking. Don't claim to "beat the ATS." Say "improve keyword match."
