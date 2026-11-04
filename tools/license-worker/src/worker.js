/**
 * License server for all extensions (Cloudflare Worker, free plan is plenty).
 *
 * Creem's license API needs your secret API key, which must never be shipped
 * inside an extension. Extensions call this worker; it adds the key and asks Creem.
 *
 *   POST /activate { key, instance_name }  -> { valid, status, expiresAt, instanceId, productId }
 *   POST /validate { key, instance_id }    -> same shape
 *
 * Secrets / vars (set in the Cloudflare dashboard or with `wrangler secret put`):
 *   CREEM_API_KEY        your Creem API key (creem_… or creem_test_…)
 *   ALLOWED_PRODUCT_IDS  comma-separated Creem product ids this server accepts (optional)
 *   ALLOWED_ORIGINS      comma-separated chrome-extension://<id> origins (optional; default: any extension)
 */
const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

function corsFor(req, env) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.length ? allowed.includes(origin) : /^(chrome|moz|safari-web)-extension:\/\//.test(origin);
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : null;
}

const MESSAGES = { 400: 'That key is not valid.', 404: 'That key is not valid.', 410: 'This key has expired or was revoked.' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsFor(req, env);
    if (req.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : new Response(null, { status: 403 });
    if (req.method === 'GET' && url.pathname === '/') return new Response('ok');
    if (!cors) return json({ valid: false, error: 'Not allowed.' }, 403, {});
    if (req.method !== 'POST' || !['/activate', '/validate'].includes(url.pathname)) return json({ valid: false, error: 'Not found.' }, 404, cors);
    if (!env.CREEM_API_KEY) return json({ valid: false, error: 'License server is not configured.' }, 500, cors);

    let input;
    try { input = await req.json(); } catch { return json({ valid: false, error: 'Bad request.' }, 400, cors); }
    const key = String(input?.key ?? '').trim().slice(0, 200);
    if (!key) return json({ valid: false, error: 'Please paste your license key.' }, 400, cors);
    const activating = url.pathname === '/activate';
    const body = activating
      ? { key, instance_name: String(input.instance_name ?? 'chrome').slice(0, 100) }
      : { key, instance_id: String(input.instance_id ?? '').slice(0, 100) };
    if (!activating && !body.instance_id) return json({ valid: false, error: 'Missing instance.' }, 400, cors);

    const base = env.CREEM_API_KEY.startsWith('creem_test_') ? 'https://test-api.creem.io' : 'https://api.creem.io';
    let res;
    try {
      res = await fetch(`${base}/v1/licenses/${activating ? 'activate' : 'validate'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.CREEM_API_KEY },
        body: JSON.stringify(body),
      });
    } catch {
      return json({ valid: false, error: 'Payment provider unreachable.' }, 502, cors);
    }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return json({ valid: false, error: 'License server is misconfigured.' }, 500, cors);
      if (MESSAGES[res.status]) return json({ valid: false, error: MESSAGES[res.status] }, 200, cors);
      return json({ valid: false, error: 'Payment provider error.' }, 502, cors);
    }
    const lic = await res.json();
    const allowedProducts = (env.ALLOWED_PRODUCT_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowedProducts.length && !allowedProducts.includes(lic.product_id)) return json({ valid: false, error: 'This key is for a different product.' }, 200, cors);
    const instanceActive = !lic.instance || lic.instance.status === 'active';
    const valid = lic.status === 'active' && instanceActive;
    return json({
      valid,
      status: lic.status,
      error: valid ? undefined : lic.status === 'expired' ? 'This key has expired.' : lic.status === 'disabled' ? 'This key was disabled.' : 'This key is not active on this browser.',
      expiresAt: lic.expires_at ?? null,
      instanceId: lic.instance?.id,
      productId: lic.product_id,
    }, 200, cors);
  },
};
