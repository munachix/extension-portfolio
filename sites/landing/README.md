# The website

One site for every product: home page, a page per product, and **per-product** privacy, terms and refund pages (plus company-wide ones that link to them).

```
site.config.json   brand name, domain, support email, governing law
src/products.mjs   all the words: headlines, steps, free vs pro, FAQ, policy facts
src/style.css      the look (paper and ink, one accent per product, light and dark)
build.mjs          generates public/  (prices + store links come from each extension.config.json)
public/            the finished site: upload this folder
```

Rebuild after any change:

```bash
pnpm site
```

Preview locally:

```bash
python3 -m http.server 4173 --directory sites/landing/public
```

## Before publishing
1. Set `brand`, `domain`, `supportEmail` and `governingLaw` in `site.config.json`. ("Plainwork" is a working name; one line changes it everywhere.) The build warns about anything still missing.
2. The terms and refund pages are written in plain English for these products, but they're not legal advice. Have someone qualified read them once before launch.
3. After each extension is approved, put its id in `storeExtensionId` in `extensions/<slug>/extension.config.json` and rebuild. The "Coming soon to Chrome" button turns into "Add to Chrome".

## Publish (Cloudflare Pages, free)
Cloudflare dashboard → Workers & Pages → Create → Pages → upload `sites/landing/public` (or connect the GitHub repo with build command `node sites/landing/build.mjs` and output directory `sites/landing/public`). Add your domain under Custom domains.

Privacy policy URL for each Chrome Web Store form: `https://<domain>/<product>/privacy.html`.
