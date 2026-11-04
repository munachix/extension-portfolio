/** Everything HireFill keeps, all in chrome.storage.local (unlimitedStorage for CV files). */
import { store, type LicenseConfig } from '@ext/core';
import cfg from '../extension.config.json';
import type { SavedAnswer } from './answers/bank';
import { emptyProfile, type Profile } from './profile/schema';

export interface StoredFile { name: string; type: string; dataUrl: string; savedAt: string }
export interface Application { id: string; company: string; role: string; url: string; portal: string; date: string; status: 'Applied' | 'Interview' | 'Offer' | 'Rejected'; cv: string; followUp?: string }
export interface AISettings { mode: 'local' | 'byok' | 'off'; provider: 'openai' | 'anthropic' | 'gemini'; apiKey: string; model: string }
export interface Settings { autoNextPage: boolean; showButton: boolean; ai: AISettings }

export const LICENSE: LicenseConfig = { provider: cfg.license.provider as LicenseConfig['provider'], licenseServerUrl: cfg.license.licenseServerUrl, productId: cfg.license.productId ?? undefined, checkoutUrl: cfg.license.checkoutUrl };
export const FREE_FILLS = cfg.freeFills;
export const PRODUCT = cfg.productName;
export const PRICE = cfg.priceText;
export const PRO_FEATURES = ['Unlimited autofills on Workday, Greenhouse, Lever, iCIMS, Taleo and more', 'CV tailoring with the truth guard, PDF + Word export', 'Cover letters and answer drafts', 'Pay once, use forever. 14-day refund.'];
export const DEFAULT_MODELS = { openai: 'gpt-4.1-mini', anthropic: 'claude-haiku-5-5', gemini: 'gemini-2.5-flash' } as const;

export const db = {
  profile: async () => ({ ...emptyProfile(), ...(await store.get<Partial<Profile>>('profile', {})) }) as Profile,
  saveProfile: (p: Profile) => store.set('profile', p),
  file: (k: 'resume' | 'coverLetter' | 'tailored') => store.get<StoredFile | null>(`file:${k}`, null),
  saveFile: (k: 'resume' | 'coverLetter' | 'tailored', f: StoredFile | null) => (f ? store.set(`file:${k}`, f) : store.remove(`file:${k}`)),
  answers: () => store.get<SavedAnswer[]>('answers', []),
  saveAnswers: (a: SavedAnswer[]) => store.set('answers', a),
  apps: () => store.get<Application[]>('applications', []),
  saveApps: (a: Application[]) => store.set('applications', a),
  settings: async () => ({ autoNextPage: true, showButton: true, ai: { mode: 'local', provider: 'openai', apiKey: '', model: '' }, ...(await store.get<Partial<Settings>>('settings', {})) }) as Settings,
  saveSettings: async (patch: Partial<Settings>) => store.set('settings', { ...(await db.settings()), ...patch }),
  fills: () => store.get<number>('fillCount', 0),
  countFill: () => store.update<number>('fillCount', 0, (n) => n + 1),
  cvText: () => store.get<string>('cvText', ''),
  saveCvText: (t: string) => store.set('cvText', t),
};

export async function fileToStored(f: File): Promise<StoredFile> {
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
  return { name: f.name, type: f.type || 'application/octet-stream', dataUrl, savedAt: new Date().toISOString() };
}
export async function storedToFile(s: StoredFile): Promise<File> {
  const blob = await (await fetch(s.dataUrl)).blob();
  return new File([blob], s.name, { type: s.type });
}

/** "Jane_Doe_CV_Stripe_Backend_Engineer.pdf" */
export function cvFileName(p: Profile, company: string, role: string, ext: string) {
  const part = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40);
  return [part(`${p.firstName} ${p.lastName}`) || 'CV', 'CV', part(company), part(role)].filter(Boolean).join('_') + `.${ext}`;
}
