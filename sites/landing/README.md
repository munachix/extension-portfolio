# The shared website

One site for every extension: home page, one folder per product (landing page + privacy policy), shared Terms and Refunds.

```
index.html            home: all products by audience
terms.html            shared terms (have them checked)
refunds.html          14-day refund policy (Creem asks for one)
<product>/index.html  landing page, linked from the Chrome Web Store listing
<product>/privacy.html privacy policy URL for the Chrome Web Store form
style.css             shared look (light + dark)
```

## Before publishing
1. Pick the brand and buy the domain (a neutral studio name, not tied to one topic).
2. Replace `BRAND-NAME` and `support@REPLACE-ME.com` everywhere:
   ```bash
   grep -rl "BRAND-NAME\|REPLACE-ME" sites/landing
   ```
3. After each extension is approved, replace its `REPLACE-AFTER-FIRST-UPLOAD` store link.

## Publish (Cloudflare Pages, free)
Cloudflare dashboard → Workers & Pages → Create → Pages → upload the `sites/landing` folder (or connect the GitHub repo with build output directory `sites/landing`). Add your domain under Custom domains. The license server lives on the same domain as `license.yourdomain.com` (see `tools/license-worker/README.md`).

Privacy policy URLs for the store forms: `https://yourdomain.com/<product>/privacy.html`.
