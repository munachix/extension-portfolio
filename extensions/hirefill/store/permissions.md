# Permission justifications

**Single purpose:** HireFill fills job application forms from the user's own profile and helps tailor their CV. It never submits applications.

| Permission | Justification |
|---|---|
| `storage`, `unlimitedStorage` | Stores the user's profile, CV files (PDF/Word), saved answers and application tracker locally. CV files can exceed the default quota. |
| `sidePanel` | The HireFill app (profile, tailoring, tracker) opens in Chrome's side panel next to the application. |
| `scripting`, `activeTab` | "Fill the current tab" on application sites not in the list below, only when the user clicks. |
| Content scripts on job application portals (Workday, Greenhouse, Lever, iCIMS, Taleo/Oracle, SmartRecruiters, Ashby, BambooHR, Workable, JazzHR, SuccessFactors, LinkedIn, Indeed), all frames | Shows the Fill button and fills the form the user is looking at. iCIMS and Taleo put forms in iframes, hence all frames. |
| Host: license server | Verifies a license key (payments by Creem). Only the key and a random browser id are sent. |
| Optional hosts: api.openai.com, api.anthropic.com, generativelanguage.googleapis.com | Requested only if the user chooses to use their own AI key. Text goes only to the provider they pick. |

**Remote code:** none. **Data:** no personal data leaves the device except (a) the license key and (b) prompts sent to the AI provider the user chose with their own key.
