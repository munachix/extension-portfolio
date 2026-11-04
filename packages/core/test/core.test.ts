import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateLicense, CACHE_MS, DAY, DEV_TEST_KEY, GRACE_MS, isPro, memoryBackend, recordSuccess, refreshLicenseIfStale,
  setStorageBackend, shouldShowRateUs, markRateUsShown, toCsv, verifyLicense, type LicenseConfig,
} from '../src';

const LS: LicenseConfig = { provider: 'lemonsqueezy', productId: 123, checkoutUrl: 'https://x.test/buy' };
const POLAR: LicenseConfig = { provider: 'polar', organizationId: 'org_1', checkoutUrl: 'https://x.test/buy' };
const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
const offline = async () => { throw new TypeError('Failed to fetch'); };

beforeEach(() => setStorageBackend(memoryBackend()));

describe('verifyLicense: Lemon Squeezy', () => {
  it('accepts an active key for the right product', async () => {
    const r = await verifyLicense('k', LS, { fetch: json({ valid: true, license_key: { status: 'active', expires_at: null }, meta: { product_id: 123 } }) as typeof fetch });
    expect(r).toEqual({ valid: true, plan: 'pro', expiresAt: null });
  });
  it('rejects a key for another product', async () => {
    const r = await verifyLicense('k', LS, { fetch: json({ valid: true, license_key: { status: 'active' }, meta: { product_id: 999 } }) as typeof fetch });
    expect(r.valid).toBe(false);
  });
  it('rejects invalid and expired keys', async () => {
    expect((await verifyLicense('k', LS, { fetch: json({ valid: false, error: 'license_key not found.' }, 404) as typeof fetch })).error).toBe('license_key not found.');
    const r = await verifyLicense('k', LS, { now: Date.parse('2027-01-01'), fetch: json({ valid: true, license_key: { status: 'active', expires_at: '2026-06-01T00:00:00Z' }, meta: { product_id: 123 } }) as typeof fetch });
    expect(r.valid).toBe(false);
  });
});

describe('verifyLicense: Polar', () => {
  it('accepts a granted key', async () => {
    const r = await verifyLicense('k', POLAR, { fetch: json({ status: 'granted', expires_at: null }) as typeof fetch });
    expect(r.valid).toBe(true);
  });
  it('404 means not valid; revoked means not valid', async () => {
    expect((await verifyLicense('k', POLAR, { fetch: json({}, 404) as typeof fetch })).valid).toBe(false);
    expect((await verifyLicense('k', POLAR, { fetch: json({ status: 'revoked' }) as typeof fetch })).valid).toBe(false);
  });
});

describe('verifyLicense: Creem (via our license server)', () => {
  const CREEM: LicenseConfig = { provider: 'creem', licenseServerUrl: 'https://license.example.com', productId: 'prod_1', checkoutUrl: 'https://x.test/buy' };
  it('activates first, then validates with the instance id', async () => {
    const calls: string[] = [];
    const f = (async (url: string, init: RequestInit) => { calls.push(`${url} ${init.body}`); return new Response(JSON.stringify({ valid: true, instanceId: 'ins_9', productId: 'prod_1', expiresAt: null })); }) as unknown as typeof fetch;
    const r = await activateLicense('KEY', CREEM, { fetch: f, now: 0 });
    expect(r).toMatchObject({ valid: true, instanceId: 'ins_9' });
    expect(calls[0]).toMatch(/\/activate .*instance_name/);
    await refreshLicenseIfStale(CREEM, { fetch: f, now: CACHE_MS + 1 });
    expect(calls[1]).toContain('/validate {"key":"KEY","instance_id":"ins_9"}');
  });
  it('passes on the server error message; 5xx counts as unreachable', async () => {
    expect((await verifyLicense('k', CREEM, { fetch: json({ valid: false, error: 'This key has expired.' }) as typeof fetch })).error).toBe('This key has expired.');
    expect((await activateLicense('k', CREEM, { fetch: json({}, 502) as typeof fetch })).error).toMatch(/Couldn't reach/);
  });
});

describe('test key', () => {
  it('works only in dev builds', async () => {
    expect((await verifyLicense(DEV_TEST_KEY, LS, { dev: true })).valid).toBe(true);
    expect((await verifyLicense(DEV_TEST_KEY, LS, { dev: false })).valid).toBe(false);
  });
});

describe('cache, refresh and offline grace', () => {
  const ok = json({ valid: true, license_key: { status: 'active' }, meta: { product_id: 123 } }) as typeof fetch;
  it('caches a valid key; isPro reads the cache', async () => {
    const t0 = Date.parse('2026-11-01');
    await activateLicense('k', LS, { fetch: ok, now: t0 });
    expect(await isPro(t0 + DAY)).toBe(true);
  });
  it('stays Pro through the grace period when offline, then drops', async () => {
    const t0 = Date.parse('2026-11-01');
    await activateLicense('k', LS, { fetch: ok, now: t0 });
    await refreshLicenseIfStale(LS, { fetch: offline as typeof fetch, now: t0 + CACHE_MS + DAY });
    expect(await isPro(t0 + CACHE_MS + GRACE_MS - DAY)).toBe(true);
    expect(await isPro(t0 + CACHE_MS + GRACE_MS + DAY)).toBe(false);
  });
  it('a revoked key downgrades on refresh', async () => {
    const t0 = Date.parse('2026-11-01');
    await activateLicense('k', LS, { fetch: ok, now: t0 });
    await refreshLicenseIfStale(LS, { fetch: json({ valid: false, error: 'disabled' }) as typeof fetch, now: t0 + CACHE_MS + 1 });
    expect(await isPro(t0 + CACHE_MS + 2)).toBe(false);
  });
  it('a network error on activation is reported, not cached', async () => {
    const r = await activateLicense('k', LS, { fetch: offline as typeof fetch });
    expect(r.valid).toBe(false);
    expect(await isPro()).toBe(false);
  });
});

describe('rate-us', () => {
  it('is due after the 3rd distinct success, shown once', async () => {
    await recordSuccess('a'); await recordSuccess('a'); await recordSuccess('b');
    expect(await shouldShowRateUs()).toBe(false);
    await recordSuccess('c');
    expect(await shouldShowRateUs()).toBe(true);
    await markRateUsShown();
    expect(await shouldShowRateUs()).toBe(false);
  });
});

describe('csv', () => {
  it('quotes and guards against formula injection', () => {
    expect(toCsv([{ a: 'x,y', b: '=SUM(A1)' }])).toBe('a,b\r\n"x,y",\'=SUM(A1)');
  });
});
