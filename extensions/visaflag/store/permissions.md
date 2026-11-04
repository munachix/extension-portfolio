# Permission justifications

**Single purpose:** VisaFlag shows whether the company on a job page appears on official visa-sponsor registers (UK, US, Canada, Netherlands).

| Permission | Justification |
|---|---|
| `storage` | Saves the user's chosen countries, settings, saved companies and license status locally. |
| `alarms` | Checks once a week for updated sponsor lists. |
| Host: data site (`https://<user>.github.io/*`) | Downloads the public sponsor lists (compressed JSON built from official government data). No user data is sent. |
| Host: license server (`https://license.<your-domain>/*`) | Verifies a Pro license key (payments by Creem). Only the key and a random browser id are sent. |
| Content scripts on LinkedIn, Indeed, Glassdoor, Reed, StepStone/Totaljobs | Reads the company name on the page the user is viewing to show the badge. Matching runs on the device; nothing is transmitted. |

**Remote code:** none. Downloaded files are data (JSON), never code.
**Data use:** no personal data or browsing data is collected or transmitted.
