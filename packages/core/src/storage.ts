/**
 * Tiny typed wrapper over chrome.storage.local.
 * Tests (and non-extension contexts) can swap in an in-memory backend.
 */
export interface StorageBackend {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export function chromeBackend(): StorageBackend {
  return {
    get: (keys) => chrome.storage.local.get(keys),
    set: (items) => chrome.storage.local.set(items),
    remove: (keys) => chrome.storage.local.remove(keys),
  };
}

export function memoryBackend(initial: Record<string, unknown> = {}): StorageBackend & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = structuredClone(initial);
  return {
    data,
    async get(keys) {
      const out: Record<string, unknown> = {};
      for (const k of keys) if (k in data) out[k] = structuredClone(data[k]);
      return out;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) data[k] = structuredClone(v);
    },
    async remove(keys) {
      for (const k of keys) delete data[k];
    },
  };
}

let defaultBackend: StorageBackend | null = null;

/** Override the backend used by `store` (tests call this). */
export function setStorageBackend(b: StorageBackend | null): void {
  defaultBackend = b;
}

function backend(): StorageBackend {
  if (defaultBackend) return defaultBackend;
  defaultBackend = chromeBackend();
  return defaultBackend;
}

export const store = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const r = await backend().get([key]);
    return (key in r ? (r[key] as T) : fallback);
  },
  async set<T>(key: string, value: T): Promise<void> {
    await backend().set({ [key]: value });
  },
  async update<T>(key: string, fallback: T, fn: (v: T) => T): Promise<T> {
    const next = fn(await store.get(key, fallback));
    await store.set(key, next);
    return next;
  },
  async remove(key: string): Promise<void> {
    await backend().remove([key]);
  },
};
