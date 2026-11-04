/**
 * CV text -> profile draft. Heuristic on purpose (no AI needed): finds contact
 * details, splits sections by their headings, reads work/education entries by
 * their date ranges. The user reviews everything on the Profile page.
 */
import { emptyProfile, type Education, type Profile, type Work } from './schema';

const HEAD = {
  experience: /^(work\s+)?(experience|employment|professional experience|work history|career history|berufserfahrung)$/i,
  education: /^(education|academic background|qualifications|ausbildung)$/i,
  skills: /^(skills|technical skills|core skills|key skills|competencies|technologies|tools)$/i,
  summary: /^(summary|profile|professional summary|about me|objective|personal statement)$/i,
  other: /^(projects|certifications?|awards|publications|languages|interests|volunteer(ing)?|references)$/i,
};
const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE = `(?:${MON}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`;
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|present|current|now|today|heute)`, 'i');

function toIsoMonth(s: string): string {
  const t = s.trim().toLowerCase();
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (m) return `${m[2]}-${String(months.indexOf(m[1]) + 1).padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})$/);
  return m ? m[1] : '';
}

export function parseCvText(text: string): Profile {
  const p = emptyProfile();
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const all = lines.join('\n');

  p.email = all.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0] ?? '';
  const phone = all.match(/(\+\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g)?.find((x) => x.replace(/\D/g, '').length >= 9 && !/^\d{4}\s*[-–]\s*\d{4}$/.test(x.trim()));
  if (phone) {
    p.phone = phone.trim();
    p.phoneCountryCode = phone.match(/^\+(\d{1,3})/)?.[1] ?? '';
  }
  p.linkedin = all.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?/i)?.[0] ?? '';
  p.github = all.match(/(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/?/i)?.[0] ?? '';
  p.website = all.match(/https?:\/\/(?!(www\.)?(linkedin|github)\.com)[\w.-]+\.[a-z]{2,}(\/\S*)?/i)?.[0] ?? '';

  // Name: first line that looks like 2–4 capitalised words and isn't contact info
  const nameLine = lines.slice(0, 5).find((l) => /^[\p{Lu}][\p{L}'.-]+(\s+[\p{Lu}][\p{L}'.-]+){1,3}$/u.test(l) && !/@|\d/.test(l));
  if (nameLine) {
    const parts = nameLine.split(' ');
    p.firstName = parts[0];
    p.lastName = parts.slice(1).join(' ');
  }
  const loc = lines.slice(0, 8).join(' | ').match(/([A-Z][a-zA-Z .'-]+),\s*([A-Z]{2}|[A-Z][a-zA-Z ]+)(?=\s*(\||$|·|•))/);
  if (loc) { p.city = loc[1].trim(); p.state = loc[2].trim(); }

  // Sections
  const sections: Record<string, string[]> = { experience: [], education: [], skills: [], summary: [] };
  let cur: string | null = null;
  for (const l of lines) {
    const bare = l.replace(/[:•\-–]+$/, '').trim();
    const hit = (Object.keys(HEAD) as (keyof typeof HEAD)[]).find((k) => HEAD[k].test(bare));
    if (hit) { cur = hit === 'other' ? null : hit; continue; }
    if (cur) sections[cur].push(l);
  }
  p.summary = sections.summary.join(' ').slice(0, 1200);
  p.skills = [...new Set(sections.skills.join(', ').split(/[,;•|·]|\s{2,}/).map((s) => s.replace(/^[-–*]\s*/, '').trim()).filter((s) => s && s.length <= 40))].slice(0, 60);
  p.work = parseEntries(sections.experience, 'work') as Work[];
  p.education = parseEntries(sections.education, 'edu') as Education[];
  if (p.work[0]) p.headline = p.work[0].title;
  return p;
}

/** Entries start at a line containing a date range; 1–2 lines above it hold title/company. */
function parseEntries(lines: string[], kind: 'work' | 'edu'): (Work | Education)[] {
  const out: (Work | Education)[] = [];
  const idx = lines.map((l, i) => (RANGE.test(l) ? i : -1)).filter((i) => i >= 0);
  idx.forEach((i, n) => {
    const line = lines[i];
    const r = line.match(RANGE)!;
    const before = line.replace(RANGE, '').replace(/[|,–—-]\s*$/, '').trim();
    const prevStart = n === 0 ? 0 : idx[n - 1] + 1;
    // header lines: text on the date line, else up to 2 short lines right above it
    // header lines in document order: up to 2 short lines above, then any text on the date line
    const heads = [...lines.slice(Math.max(prevStart, i - 2), i).filter((l) => l.length < 90 && !/^[•\-*]/.test(l)), before].filter(Boolean);
    const nextStart = idx[n + 1] ?? lines.length;
    const body = lines.slice(i + 1, nextStart - (idx[n + 1] != null ? Math.min(2, nextStart - i - 1) : 0));
    const [a = '', b = ''] = splitHeader(heads);
    const start = toIsoMonth(r[1]);
    const endRaw = r[2];
    const current = /present|current|now|today|heute/i.test(endRaw);
    const end = current ? '' : toIsoMonth(endRaw);
    if (kind === 'work') out.push({ title: a, company: b, location: '', start, end, current, description: body.join('\n').slice(0, 2000) });
    else {
      const deg = /(bachelor|master|b\.?sc|m\.?sc|b\.?a\.?|m\.?a\.?|mba|ph\.?d|bs|ms|beng|meng|diploma|associate|hnd|ond)/i;
      const [school, degreeLine] = deg.test(a) ? [b, a] : [a, b];
      const [degree, field] = degreeLine.split(/\s+(?:in|of)\s+|,\s*/i);
      out.push({ school, degree: degree ?? '', field: field ?? '', start, end, gpa: body.join(' ').match(/gpa[:\s]*([\d.]+)/i)?.[1] ?? '' });
    }
  });
  return out;
}

/** ["Senior Engineer", "Acme Corp | London"] or ["Senior Engineer at Acme Corp"] -> [title, company] */
function splitHeader(heads: string[]): [string, string] {
  const dropLoc = (x: string) => x.split(/\s+[|·]\s+/)[0].trim();
  if (heads.length >= 2) return [dropLoc(heads[heads.length - 2]), dropLoc(heads[heads.length - 1])];
  const one = heads[0] ?? '';
  // commas/pipes first ("B.Sc. CS, University of Texas at Austin"), then " at " ("Engineer at Stripe")
  let parts = one.split(/\s+[|–—]\s+|,\s+/);
  if (parts.length < 2) parts = one.split(/\s+(?:at|@)\s+/);
  return [parts[0]?.trim() ?? '', parts.slice(1).join(', ').trim()];
}
