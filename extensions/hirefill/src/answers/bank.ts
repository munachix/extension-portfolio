/** Answer Bank: answers the user typed once, reused for similar questions later. */
export interface SavedAnswer { question: string; answer: string; savedAt: string; uses: number }

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'for', 'you', 'your', 'are', 'is', 'do', 'what', 'why', 'how', 'with', 'this', 'that', 'us', 'we', 'our', 'please', 'describe', 'tell', 'about', 'have', 'at', 'on', 'be', 'would', 'any', 'here', 'there', 'can', 'will', 'want']);
const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

/** 0..1 similarity between two questions (token overlap, weighted to the shorter one). */
export function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / Math.min(A.size, B.size) * 0.7 + inter / (A.size + B.size - inter) * 0.3;
}

export function findAnswer(bank: SavedAnswer[], question: string, min = 0.62): SavedAnswer | null {
  let best: SavedAnswer | null = null, s = 0;
  for (const a of bank) {
    const x = similarity(a.question, question);
    if (x > s) { s = x; best = a; }
  }
  return s >= min ? best : null;
}

export function upsert(bank: SavedAnswer[], question: string, answer: string): SavedAnswer[] {
  const q = question.trim().slice(0, 300);
  const i = bank.findIndex((a) => similarity(a.question, q) > 0.9);
  const entry = { question: q, answer, savedAt: new Date().toISOString(), uses: 0 };
  return i >= 0 ? bank.map((a, k) => (k === i ? { ...entry, uses: a.uses } : a)) : [entry, ...bank];
}
