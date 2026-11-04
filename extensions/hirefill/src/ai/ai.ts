/**
 * AI layer: Chrome's built-in model (Gemini Nano, free, on-device) when the
 * computer supports it; else the user's own API key; else off (autofill still works).
 */
import { DEFAULT_MODELS, type AISettings } from '../store';

declare global {
  // Chrome Prompt API (Chrome 138+ for extensions)
  // eslint-disable-next-line no-var
  var LanguageModel: undefined | { availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>; create(o?: { monitor?: (m: EventTarget) => void; initialPrompts?: { role: string; content: string }[] }): Promise<{ prompt(t: string): Promise<string>; destroy(): void }> };
}

export const SYSTEM = 'You help a job seeker write application materials. Use ONLY facts from PROFILE. Never invent employers, job titles, dates, degrees, numbers, tools or achievements. If something is not in PROFILE, leave it out. Write plainly, no buzzwords.';

export async function localStatus(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'> {
  try { return (await globalThis.LanguageModel?.availability()) ?? 'unavailable'; } catch { return 'unavailable'; }
}

export async function complete(ai: AISettings, prompt: string, onProgress?: (pct: number) => void): Promise<string> {
  if (ai.mode === 'off') throw new Error('AI is turned off in Settings.');
  if (ai.mode === 'local') {
    const LM = globalThis.LanguageModel;
    if (!LM || (await localStatus()) === 'unavailable') throw new Error('This computer can’t run Chrome’s built-in AI. Add your own API key in Settings, or keep AI off.');
    const s = await LM.create({
      initialPrompts: [{ role: 'system', content: SYSTEM }],
      monitor: (m) => m.addEventListener('downloadprogress', (e) => onProgress?.(Math.round(((e as unknown as { loaded: number }).loaded ?? 0) * 100))),
    });
    try { return await s.prompt(prompt); } finally { s.destroy(); }
  }
  if (!ai.apiKey) throw new Error('Add your API key in Settings.');
  const model = ai.model || DEFAULT_MODELS[ai.provider];
  if (ai.provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], temperature: 0.3 }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message ?? `OpenAI error ${r.status}`);
    return j.choices[0].message.content;
  }
  if (ai.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ai.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 1500, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message ?? `Anthropic error ${r.status}`);
    return j.content.map((c: { text?: string }) => c.text ?? '').join('');
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(ai.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }] }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message ?? `Gemini error ${r.status}`);
  return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

export const AI_HOSTS = { openai: 'https://api.openai.com/*', anthropic: 'https://api.anthropic.com/*', gemini: 'https://generativelanguage.googleapis.com/*' } as const;
