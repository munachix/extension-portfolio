/** Splits text into sentences with offsets, without breaking "U.S." or "e.g.". */
export interface Sentence { start: number; end: number; text: string }

const ABBREV = /(?:^|[\s(])(?:U\.S|U\.K|E\.U|U\.S\.A|D\.C|e\.g|i\.e|etc|vs|approx|Inc|Ltd|Co|Corp|Sr|Jr|St|Dr|Mr|Ms|Mrs|No|a\.m|p\.m|z\.B|bzw|ca|inkl|ggf|[A-Z])$/;

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  const push = (end: number) => {
    const raw = text.slice(start, end);
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim();
    if (t) out.push({ start: start + lead, end: start + lead + t.length, text: t });
  };
  const re = /[.!?](?=\s|$)|\n+|[•·▪●]|\s[–—]\s/g;
  for (const m of text.matchAll(re)) {
    const i = m.index!;
    if (m[0] === '.' && ABBREV.test(text.slice(Math.max(0, i - 8), i))) continue;
    const end = m[0] === '.' || m[0] === '!' || m[0] === '?' ? i + 1 : i;
    push(end);
    start = i + m[0].length;
  }
  push(text.length);
  return out;
}
