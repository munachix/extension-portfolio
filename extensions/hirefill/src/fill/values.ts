/** What to put in a field, given what it asks for. */
import type { Key } from './keys';
import { countryPrefs, DECLINE_PREFS } from './match';
import { DECLINE, yearsOfExperience, type Profile } from '../profile/schema';

export interface Want {
  /** Text to type (text inputs, textareas, combobox search). */
  text?: string;
  /** Preferred option labels, best first (selects, radios, comboboxes). */
  choice?: string[];
  /** Checkbox state. */
  checked?: boolean;
  /** Attach a stored file. */
  file?: 'resume' | 'coverLetter';
}

const yn = (v: string) => (v === 'yes' ? ['Yes'] : v === 'no' ? ['No'] : []);
const demo = (v: string) => (!v || v === DECLINE ? DECLINE_PREFS : [v, ...DECLINE_PREFS]);
const monthYear = (iso: string) => iso;

export function wantFor(key: Key, p: Profile, ctx: { work?: number; edu?: number } = {}): Want | null {
  const w = p.work[ctx.work ?? 0];
  const e = p.education[ctx.edu ?? 0];
  const t = (s: string | undefined) => (s ? { text: s, choice: [s] } : null);
  switch (key) {
    case 'firstName': return t(p.firstName);
    case 'lastName': return t(p.lastName);
    case 'fullName': return t([p.firstName, p.lastName].filter(Boolean).join(' '));
    case 'preferredName': return t(p.preferredName || p.firstName);
    case 'email': return t(p.email);
    case 'phone': return t(p.phone);
    case 'phoneCountryCode': return p.phoneCountryCode ? { text: `+${p.phoneCountryCode}`, choice: [`+${p.phoneCountryCode}`, ...countryPrefs(p.country)] } : null;
    case 'phoneType': return { choice: ['Mobile', 'Cell', 'Mobile Phone'] };
    case 'address1': return t(p.address1);
    case 'city': return t(p.city);
    case 'state': return t(p.state);
    case 'postalCode': return t(p.postalCode);
    case 'country': return p.country ? { text: p.country, choice: countryPrefs(p.country) } : null;
    case 'location': return t([p.city, p.state || p.country].filter(Boolean).join(', '));
    case 'linkedin': return t(p.linkedin);
    case 'github': return t(p.github);
    case 'website': return t(p.website || p.linkedin);
    case 'currentCompany': return t(p.work.find((x) => x.current)?.company ?? p.work[0]?.company);
    case 'currentTitle': return t(p.work.find((x) => x.current)?.title ?? p.work[0]?.title);
    case 'yearsExperience': { const y = p.answers.yearsExperience || String(yearsOfExperience(p) || ''); return y ? { text: y, choice: [y, `${y}+`, `${y} years`] } : null; }
    case 'salaryExpectation': return t(p.answers.salaryExpectation);
    case 'noticePeriod': return t(p.answers.noticePeriod);
    case 'startDate': return null;
    case 'authorizedToWork': return p.answers.authorizedToWork ? { choice: yn(p.answers.authorizedToWork) } : null;
    case 'needSponsorship': return p.answers.needSponsorship ? { choice: yn(p.answers.needSponsorship) } : null;
    case 'willingToRelocate': return p.answers.willingToRelocate ? { choice: yn(p.answers.willingToRelocate) } : null;
    case 'howDidYouHear': return { text: p.answers.howDidYouHear, choice: [p.answers.howDidYouHear, 'Company Website', 'Careers Site', 'Careers Page', 'Website', 'Job Board', 'LinkedIn', 'Other'].filter(Boolean) };
    case 'gender': return { choice: demo(p.answers.gender) };
    case 'ethnicity': return { choice: demo(p.answers.ethnicity) };
    case 'hispanic': return { choice: p.answers.ethnicity && p.answers.ethnicity !== DECLINE ? [/hispanic|latino/i.test(p.answers.ethnicity) ? 'Yes' : 'No', ...DECLINE_PREFS] : DECLINE_PREFS };
    case 'veteran': return { choice: demo(p.answers.veteran).concat(['I am not a protected veteran']) };
    case 'disability': return { choice: demo(p.answers.disability).concat(["I don't wish to answer"]) };
    case 'resume': return { file: 'resume' };
    case 'coverLetter': return null; // only if the user generated one
    case 'workTitle': return t(w?.title);
    case 'workCompany': return t(w?.company);
    case 'workLocation': return t(w?.location);
    case 'workStart': return w?.start ? { text: monthYear(w.start) } : null;
    case 'workEnd': return w && !w.current && w.end ? { text: monthYear(w.end) } : null;
    case 'workCurrent': return w ? { checked: !!w.current } : null;
    case 'workDescription': return t(w?.description);
    case 'eduSchool': return t(e?.school);
    case 'eduDegree': return e?.degree ? { text: e.degree, choice: [e.degree, ...degreeAliases(e.degree)] } : null;
    case 'eduField': return t(e?.field);
    case 'eduStart': return e?.start ? { text: e.start } : null;
    case 'eduEnd': return e?.end ? { text: e.end } : null;
    case 'eduGpa': return t(e?.gpa);
    case 'acceptTerms': return null; // consent is always the user's to give
  }
}

function degreeAliases(d: string): string[] {
  if (/bachelor|b\.?sc|b\.?a\b|bs\b|beng/i.test(d)) return ["Bachelor's Degree", 'Bachelors', 'Bachelor'];
  if (/master|m\.?sc|m\.?a\b|ms\b|meng|mba/i.test(d)) return ["Master's Degree", 'Masters', 'Master'];
  if (/ph\.?d|doctor/i.test(d)) return ['Doctorate', 'PhD', 'Doctoral Degree'];
  if (/associate/i.test(d)) return ["Associate's Degree"];
  return [];
}
