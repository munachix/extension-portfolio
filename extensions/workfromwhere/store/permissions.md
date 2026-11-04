# Permission justifications (paste into the Chrome Web Store "Privacy practices" tab)

**Single purpose:** WorkFromWhere shows whether a remote job post accepts applicants from the user's country, on the job page the user is viewing.

| Permission | Justification |
|---|---|
| `storage` | Saves the user's country, time zone, settings, saved jobs and license status on their own computer (`chrome.storage.local`). Nothing is synced to a server. |
| `activeTab` | When the user clicks "Check this page" in the popup on a job site we don't list, lets the extension read that one tab once. |
| `scripting` | Used together with `activeTab` to run the checker in that tab after the user clicks "Check this page". |
| Host: `https://api.lemonsqueezy.com/*` | Verifies a Pro license key the user enters. Only the key is sent; no browsing data. |
| Content scripts on job sites (LinkedIn, Indeed, SEEK, StepStone, Totaljobs, Reed, XING, JOIN, We Work Remotely, Remote OK, Wellfound, Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Personio, Recruitee) | Reads the job description and location on the job page the user opens, to show the badge. Text is processed on the device and never transmitted. |

**Remote code:** none. All code is in the package.

**Data use disclosures:** the extension does not collect or transmit personally identifiable information, browsing history, or website content. Check "I do not sell or transfer user data to third parties" and the other two certifications.
