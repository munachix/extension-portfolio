# Extension portfolio

A monorepo of small paid Chrome extensions (Manifest V3, TypeScript, Vite) that share one core.

```
packages/core       license keys (Creem via our license server; Lemon Squeezy + Polar also supported), storage, rate-us prompt, CSV
packages/ui         shared CSS tokens + the upgrade/paywall box
packages/job-sites  page readers for 17 job sites (LinkedIn, Indeed, SEEK, StepStone, …), shared by all job-seeker extensions
packages/testing    Playwright helpers: load an unpacked extension, serve local fixtures, block real network
extensions/<slug>   hirefill · visaflag · flipcomps · reconfinder · borderbatch · workfromwhere
tools/license-worker  Cloudflare Worker that checks Creem license keys for all extensions
tools/release       build, test, assets, release (zip + store listing)
tools/scorecard     weekly success tracking: which extensions hit $72/mo (see its README)
sites/landing       landing pages + privacy policies
specs/              the product specs
```

## Setup (once)

Needs Node 22+ and pnpm.

```bash
pnpm install
```

## Everyday commands

```bash
pnpm build workfromwhere
```
```bash
pnpm test workfromwhere
```
```bash
pnpm release workfromwhere
```

See `extensions/workfromwhere/README.md` for how to load it in Chrome. `PROGRESS.md` says what's done and what's next.
