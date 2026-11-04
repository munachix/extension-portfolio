/** The applicant profile HireFill fills forms from. Lives only in chrome.storage.local. */
export interface Work { title: string; company: string; location: string; start: string; end: string; current: boolean; description: string }
export interface Education { school: string; degree: string; field: string; start: string; end: string; gpa: string }

export interface Profile {
  firstName: string; lastName: string; preferredName: string;
  email: string; phone: string; phoneCountryCode: string;
  address1: string; city: string; state: string; postalCode: string; country: string;
  linkedin: string; github: string; website: string;
  headline: string; summary: string;
  work: Work[]; education: Education[]; skills: string[];
  /** The 10 common questions, answered once. */
  answers: {
    authorizedToWork: 'yes' | 'no' | '';
    needSponsorship: 'yes' | 'no' | '';
    noticePeriod: string;
    salaryExpectation: string;
    willingToRelocate: 'yes' | 'no' | '';
    yearsExperience: string;
    howDidYouHear: string;
    gender: string; ethnicity: string; veteran: string; disability: string;
  };
}

export const DECLINE = 'Prefer not to say';

export function emptyProfile(): Profile {
  return {
    firstName: '', lastName: '', preferredName: '', email: '', phone: '', phoneCountryCode: '',
    address1: '', city: '', state: '', postalCode: '', country: '',
    linkedin: '', github: '', website: '', headline: '', summary: '',
    work: [], education: [], skills: [],
    answers: {
      authorizedToWork: '', needSponsorship: '', noticePeriod: '', salaryExpectation: '', willingToRelocate: '',
      yearsExperience: '', howDidYouHear: 'Company website', gender: DECLINE, ethnicity: DECLINE, veteran: DECLINE, disability: DECLINE,
    },
  };
}

/** Years of experience from work history, if the user didn't type it. */
export function yearsOfExperience(p: Profile, now = new Date()): number {
  let months = 0;
  for (const w of p.work) {
    const s = parseMonth(w.start);
    const e = w.current || !w.end ? { y: now.getFullYear(), m: now.getMonth() + 1 } : parseMonth(w.end);
    if (s && e) months += Math.max(0, (e.y - s.y) * 12 + (e.m - s.m));
  }
  return Math.round(months / 12);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** "2021-03", "Mar 2021", "03/2021", "2021" -> { y, m } */
export function parseMonth(s: string): { y: number; m: number } | null {
  const t = s.trim().toLowerCase();
  let m = t.match(/^(\d{4})-(\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2] };
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return { y: +m[2], m: +m[1] };
  m = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (m && MONTHS.includes(m[1])) return { y: +m[2], m: MONTHS.indexOf(m[1]) + 1 };
  m = t.match(/^(\d{4})$/);
  if (m) return { y: +m[1], m: 1 };
  return null;
}
