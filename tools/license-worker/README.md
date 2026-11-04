# License server (Cloudflare Worker)

Creem's license-key API needs your **secret** Creem API key, and a secret can't be put inside an extension (anyone can unzip one). So every extension asks this small server instead, and the server asks Creem. One server covers all your extensions.

Cost: free (Cloudflare Workers free plan: 100,000 requests a day; each Pro user makes about one a week).

## One-time setup (about 15 minutes)

1. **Creem:** for each extension, create a product with **License keys** turned on. Copy each product id (`prod_…`). Dashboard → Settings → API Keys → copy your API key. Start with the **test** key (`creem_test_…`) and switch to the live one when you launch.
2. **Cloudflare:** create a free account and add your domain (the one shared website).
3. In this folder, run:

   ```bash
   npx wrangler login
   ```
   ```bash
   npx wrangler secret put CREEM_API_KEY
   ```
   (paste the Creem key when asked)
4. Open `wrangler.toml` and put your product ids in `ALLOWED_PRODUCT_IDS`, e.g. `"prod_abc,prod_def"`.
5. Deploy:

   ```bash
   npx wrangler deploy
   ```
6. In Cloudflare → Workers → `license` → Settings → Domains, add `license.yourdomain.com`.
7. Put `https://license.yourdomain.com` in each extension's `extension.config.json` → `license.licenseServerUrl`, plus that extension's `productId` and Creem checkout link.

After your first store upload, you can lock the server to your own extensions by listing them in `ALLOWED_ORIGINS` (`chrome-extension://<id>`).

## Check it's running

Open `https://license.yourdomain.com/` in a browser: it should say `ok`.
