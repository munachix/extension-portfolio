/**
 * License keys from Creem, Lemon Squeezy or Polar behind one interface.
 *
 *   verifyLicense(key, config) -> { valid, plan, expiresAt }
 *
 * Creem's license API needs the merchant's secret key, so extensions talk to
 * our own small license server (tools/license-worker) instead of Creem.
 * A key is activated once per browser (Creem returns an instance id) and then
 * re-validated with key + instance id.
 *
 * Valid results are cached for 7 days. If the server can't be reached after
 * that, the cached result is still honoured for a 14-day offline grace period.
 * Content scripts only READ the cache (isPro); extension pages/background refresh it.
 */
import { store } from './storage';

export type Plan = 'free' | 'pro';
export type Provider = 'creem' | 'lemonsqueezy' | 'polar';

export interface LicenseConfig {
  provider: Provider;
  /** Creem: base URL of our license server, e.g. https://license.yourbrand.com */
  licenseServerUrl?: string;
  /** Creem (prod_…) or Lemon Squeezy (number): product the key must belong to. */
  productId?: string | number | null;
  /**
   * Several products that unlock this extension (e.g. monthly + lifetime).
   * With one license server for every extension, this is what stops a key bought
   * for one extension from unlocking another.
   */
  productIds?: (string | number)[];
  /** Polar: organization id (required for Polar validation). */
  organizationId?: string;
  /** Polar: benefit id the key must belong to (optional). */
  benefitId?: string;
  /** Hosted checkout page where people buy a key. */
  checkoutUrl: string;
}

export interface LicenseResult {
  valid: boolean;
  plan: Plan;
  expiresAt: string | null;
  error?: string;
  /** Creem: the activation instance for this browser. */
  instanceId?: string;
}

export interface CachedLicense {
  key: string;
  result: LicenseResult;
  checkedAt: number;
  instanceId?: string;
}

export const DAY = 24 * 60 * 60 * 1000;
export const CACHE_MS = 7 * DAY;
export const GRACE_MS = 14 * DAY;
const CACHE_KEY = 'license';

/** Key that unlocks Pro in dev/test builds only. Never accepted in store builds. */
export const DEV_TEST_KEY = 'TEST-PRO-0000-0000';

type FetchFn = typeof fetch;
interface VerifyOpts { fetch?: FetchFn; now?: number; dev?: boolean; instanceId?: string }

const invalid = (error: string): LicenseResult => ({ valid: false, plan: 'free', expiresAt: null, error });

/** Product ids this extension accepts; empty means "any" (dev builds only — release refuses it). */
export function acceptedProducts(config: Pick<LicenseConfig, 'productId' | 'productIds'>): string[] {
  return [...(config.productIds ?? []), ...(config.productId != null ? [config.productId] : [])].map(String).filter(Boolean);
}

function productOk(config: LicenseConfig, id: string | number | null | undefined): boolean {
  const ok = acceptedProducts(config);
  return ok.length === 0 || (id != null && ok.includes(String(id)));
}

function notExpired(expiresAt: string | null | undefined, now: number): boolean {
  return !expiresAt || Date.parse(expiresAt) > now;
}

function instanceName(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `chrome-${id}`;
}

export async function verifyLicense(rawKey: string, config: LicenseConfig, opts: VerifyOpts = {}): Promise<LicenseResult> {
  const key = rawKey.trim();
  const now = opts.now ?? Date.now();
  const doFetch = opts.fetch ?? fetch;
  const dev = opts.dev ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  if (!key) return invalid('Please paste your license key.');
  if (key === DEV_TEST_KEY) {
    return dev ? { valid: true, plan: 'pro', expiresAt: null } : invalid('That key is not valid.');
  }

  if (config.provider === 'creem') {
    if (!config.licenseServerUrl) return invalid('License server is not configured.');
    const base = config.licenseServerUrl.replace(/\/+$/, '');
    const body = opts.instanceId ? { key, instance_id: opts.instanceId } : { key, instance_name: instanceName() };
    const res = await doFetch(`${base}/${opts.instanceId ? 'validate' : 'activate'}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status >= 500) throw new Error(`License server returned ${res.status}`);
    const data = (await res.json().catch(() => ({}))) as { valid?: boolean; error?: string; expiresAt?: string | null; instanceId?: string; productId?: string };
    if (!data.valid) return invalid(data.error || 'That key is not valid.');
    if (!productOk(config, data.productId)) return invalid('This key is for a different product.');
    if (!notExpired(data.expiresAt, now)) return invalid('This key has expired.');
    return { valid: true, plan: 'pro', expiresAt: data.expiresAt ?? null, instanceId: data.instanceId ?? opts.instanceId };
  }

  if (config.provider === 'lemonsqueezy') {
    const res = await doFetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ license_key: key }).toString(),
    });
    const data = (await res.json().catch(() => ({}))) as {
      valid?: boolean;
      error?: string | null;
      license_key?: { status?: string; expires_at?: string | null };
      meta?: { product_id?: number | string };
    };
    if (!data.valid) return invalid(data.error || 'That key is not valid.');
    if (!productOk(config, data.meta?.product_id)) {
      return invalid('This key is for a different product.');
    }
    const status = data.license_key?.status;
    const expiresAt = data.license_key?.expires_at ?? null;
    if (status && status !== 'active' && status !== 'inactive') return invalid(`This key is ${status}.`);
    if (!notExpired(expiresAt, now)) return invalid('This key has expired.');
    return { valid: true, plan: 'pro', expiresAt };
  }

  if (config.provider === 'polar') {
    if (!config.organizationId) return invalid('Polar organizationId is not configured.');
    const res = await doFetch('https://api.polar.sh/v1/customer-portal/license-keys/validate', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: config.organizationId }),
    });
    if (res.status === 404) return invalid('That key is not valid.');
    if (!res.ok) throw new Error(`Polar returned ${res.status}`);
    const data = (await res.json()) as { status?: string; expires_at?: string | null; benefit_id?: string };
    if (data.status !== 'granted') return invalid(`This key is ${data.status ?? 'not active'}.`);
    if (config.benefitId && data.benefit_id !== config.benefitId) return invalid('This key is for a different product.');
    const expiresAt = data.expires_at ?? null;
    if (!notExpired(expiresAt, now)) return invalid('This key has expired.');
    return { valid: true, plan: 'pro', expiresAt };
  }

  return invalid('Unknown license provider.');
}

export async function getCachedLicense(): Promise<CachedLicense | null> {
  return store.get<CachedLicense | null>(CACHE_KEY, null);
}

/** Pro if a valid result was checked within cache + grace and hasn't expired. Read-only; safe in content scripts. */
export async function isPro(now = Date.now()): Promise<boolean> {
  const c = await getCachedLicense();
  if (!c || !c.result.valid) return false;
  if (!notExpired(c.result.expiresAt, now)) return false;
  return now - c.checkedAt <= CACHE_MS + GRACE_MS;
}

/** Validate (and for Creem, activate) a newly entered key and cache it. */
export async function activateLicense(key: string, config: LicenseConfig, opts: VerifyOpts = {}): Promise<LicenseResult> {
  let result: LicenseResult;
  try {
    result = await verifyLicense(key, config, { ...opts, instanceId: undefined });
  } catch {
    return invalid("Couldn't reach the license server. Check your internet connection and try again.");
  }
  if (result.valid) await store.set<CachedLicense>(CACHE_KEY, { key: key.trim(), result, checkedAt: opts.now ?? Date.now(), instanceId: result.instanceId });
  return result;
}

/**
 * Re-check the cached key if it's older than 7 days.
 * Network errors keep the cached result (grace period is enforced by isPro).
 * A definite "invalid" answer from the provider downgrades to free.
 */
export async function refreshLicenseIfStale(config: LicenseConfig, opts: VerifyOpts = {}): Promise<void> {
  const now = opts.now ?? Date.now();
  const c = await getCachedLicense();
  if (!c || now - c.checkedAt < CACHE_MS) return;
  try {
    const result = await verifyLicense(c.key, config, { ...opts, instanceId: c.instanceId });
    await store.set<CachedLicense>(CACHE_KEY, { key: c.key, result, checkedAt: now, instanceId: result.instanceId ?? c.instanceId });
  } catch {
    /* offline: keep cache, grace period applies */
  }
}

export async function deactivateLicense(): Promise<void> {
  await store.remove(CACHE_KEY);
}

/** Host permission the manifest needs for the configured license provider. */
export function licenseHost(config: Pick<LicenseConfig, 'provider' | 'licenseServerUrl'> | Provider): string {
  const c = typeof config === 'string' ? { provider: config } : config;
  if (c.provider === 'creem') {
    if (!c.licenseServerUrl) throw new Error('license.licenseServerUrl is required for Creem');
    return `${new URL(c.licenseServerUrl).origin}/*`;
  }
  return c.provider === 'polar' ? 'https://api.polar.sh/*' : 'https://api.lemonsqueezy.com/*';
}
