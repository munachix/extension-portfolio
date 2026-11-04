import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/worker.js';

const ORIGIN = 'chrome-extension://abcdefghijklmnop';
const env = { CREEM_API_KEY: 'creem_test_123', ALLOWED_PRODUCT_IDS: 'prod_wfw' };
const post = (path, body, origin = ORIGIN) => new Request(`https://license.example.com${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const creem = (body, status = 200) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
const LIC = { product_id: 'prod_wfw', status: 'active', expires_at: null, instance: { id: 'ins_1', status: 'active' } };
afterEach(() => vi.restoreAllMocks());

describe('license worker', () => {
  it('activates through Creem test mode with the secret key', async () => {
    const f = creem(LIC);
    const r = await worker.fetch(post('/activate', { key: 'K', instance_name: 'chrome-1' }), env);
    expect(await r.json()).toMatchObject({ valid: true, instanceId: 'ins_1', productId: 'prod_wfw' });
    expect(f.mock.calls[0][0]).toBe('https://test-api.creem.io/v1/licenses/activate');
    expect(f.mock.calls[0][1].headers['x-api-key']).toBe('creem_test_123');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });
  it('validates with key + instance id', async () => {
    const f = creem(LIC);
    await worker.fetch(post('/validate', { key: 'K', instance_id: 'ins_1' }), env);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ key: 'K', instance_id: 'ins_1' });
  });
  it('rejects other products, expired and unknown keys', async () => {
    creem({ ...LIC, product_id: 'prod_other' });
    expect((await (await worker.fetch(post('/activate', { key: 'K' }), env)).json()).error).toMatch(/different product/);
    vi.restoreAllMocks(); creem({ ...LIC, status: 'expired' });
    expect((await (await worker.fetch(post('/validate', { key: 'K', instance_id: 'i' }), env)).json()).valid).toBe(false);
    vi.restoreAllMocks(); creem({}, 404);
    expect(await (await worker.fetch(post('/activate', { key: 'K' }), env)).json()).toEqual({ valid: false, error: 'That key is not valid.' });
  });
  it('refuses calls that are not from an extension, and never leaks the key', async () => {
    const r = await worker.fetch(post('/activate', { key: 'K' }, 'https://evil.example'), env);
    expect(r.status).toBe(403);
    expect(await r.text()).not.toContain('creem_test_123');
  });
  it('a bad server key is reported as misconfiguration (500), not as an invalid customer key', async () => {
    creem({}, 401);
    const r = await worker.fetch(post('/activate', { key: 'K' }), env);
    expect(r.status).toBe(500);
  });
});
