/**
 * Truth guard: AI output may only use facts from the profile. Any number, year,
 * or proper name in a sentence that doesn't appear in the profile flags that sentence.
 */
const NUM = /\b\d[\d,.]*\s*%?|\$\s?\d[\d,.]*[kKmM]?/g;
const PROPER = /\b([A-Z][a-zA-Z0-9&.+-]+(?:\s+[A-Z][a-zA-Z0-9&.+-]+)*)\b/g;
const COMMON = new Set(['I', 'My', 'The', 'A', 'An', 'In', 'At', 'As', 'With', 'For', 'This', 'That', 'Led', 'Built', 'Managed', 'Developed', 'Designed', 'Created', 'Improved', 'Delivered', 'Worked', 'Dear', 'Hiring', 'Manager', 'Team', 'Sincerely', 'Thank', 'Thanks', 'Regards', 'Best', 'Yours', 'Hello', 'Hi', 'Over', 'By', 'Through', 'From', 'To', 'And', 'Responsible', 'Collaborated', 'Drove', 'Owned', 'Launched', 'Implemented', 'Increased', 'Reduced', 'Partnered', 'Helped', 'Supported', 'Mentored', 'Wrote', 'Ran', 'Shipped', 'Spearheaded', 'Streamlined', 'Optimized', 'Optimised']);

export interface GuardResult { ok: boolean; sentences: { text: string; unknown: string[] }[] }

export function truthGuard(output: string, profileText: string, extraAllowed: string = ''): GuardResult {
  const known = `${profileText}\n${extraAllowed}`.toLowerCase().replace(/,/g, '');
  const sentences = output.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());
  const res = sentences.map((text) => {
    const unknown: string[] = [];
    for (const m of text.matchAll(NUM)) {
      const v = m[0].replace(/[\s,$]/g, '').toLowerCase();
      if (v && !known.includes(v.replace(/%$/, ''))) unknown.push(m[0].trim());
    }
    for (const m of text.matchAll(PROPER)) {
      const words = m[1].split(/\s+/).filter((w) => !COMMON.has(w));
      const name = words.join(' ');
      if (name.length > 1 && !known.includes(name.toLowerCase())) unknown.push(name);
    }
    return { text, unknown: [...new Set(unknown)] };
  });
  return { ok: res.every((r) => !r.unknown.length), sentences: res };
}
