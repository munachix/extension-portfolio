# HireFill

Job application autofill + CV tailoring. Pay once ($39). Fills Workday, Greenhouse, Lever, iCIMS, Taleo/Oracle, SmartRecruiters, Ashby, BambooHR, Workable, JazzHR, SuccessFactors, LinkedIn Easy Apply and Indeed. **Never clicks Submit.**

## Try it
1. `pnpm build hirefill`, then `chrome://extensions` → Developer mode → **Load unpacked** → `extensions/hirefill/dist`.
2. The HireFill tab opens: upload your CV (PDF/Word), check Profile and Questions.
3. Open a real application (e.g. any `jobs.lever.co/<company>/<id>/apply` or a Greenhouse job) and click **⚡ Fill with HireFill**.
4. Pro test key (dev build only): `TEST-PRO-0000-0000` in Settings.

## How it fills
- `src/fill/fields.ts` finds fields and their question text (labels, aria, Workday `data-automation-id`, Lever `.application-label`, fieldsets).
- `src/fill/keys.ts` maps questions to ~50 profile keys (English + common German). `src/fill/values.ts` decides the answer.
- `src/fill/engine.ts` fills like a person: native value setter + input/change/blur; opens custom dropdowns and picks the best option; attaches the CV via DataTransfer; on Workday, clicks **Add** for each job/education entry and fills month/year dates. After you click Next, it fills the next page.
- `src/fill/guard.ts`: every click goes through `safeClick`, which refuses Submit/Apply/Send buttons and form submit buttons.
- Consent checkboxes ("I agree to the privacy policy") are never ticked: they're marked red for you.

## Status of each portal
| Portal | Tested against |
|---|---|
| Greenhouse (new boards) | Field structure from a live form, Nov 2026; react-select behaviour simulated in a fixture |
| Lever | Field structure from a live form, Nov 2026 |
| Workday | **Modelled** on Workday's documented `data-automation-id`s; applications need an account, so no live capture yet |
| iCIMS, Taleo, SmartRecruiters, Ashby, BambooHR, Workable, JazzHR, SuccessFactors, LinkedIn, Indeed | Generic label matching only, not yet tested |

**Next step for real accuracy:** spec §7's test set: 30 real application URLs (6 per major portal), a fill-accuracy % per release. That needs you to try real applications (Workday needs a login) and tell me which fields miss.

## AI
Chrome's built-in model (Prompt API) when the computer supports it (16 GB RAM or a GPU with >4 GB, 22 GB free disk), else the user's own OpenAI/Anthropic/Gemini key, else off. The truth guard (`src/ai/truth.ts`) flags names and numbers that aren't in the profile. It **can't** catch vague invented claims ("improving reliability"), which is why every change is shown before/after and must be ticked by the user.

## Known limitations
- CV parsing is heuristic: unusual layouts (two columns, tables) need fixing on the Profile page.
- PDF export uses standard fonts (Latin characters only; others are dropped). Word export keeps everything.
