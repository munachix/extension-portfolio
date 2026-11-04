/**
 * What a form field asks for. Each key has label patterns (English, plus
 * common German), checked against a field's label, name, id, placeholder and
 * portal attributes. Order matters: more specific first.
 */
export type Key =
  | 'firstName' | 'lastName' | 'fullName' | 'preferredName' | 'email' | 'phone' | 'phoneCountryCode' | 'phoneType'
  | 'address1' | 'city' | 'state' | 'postalCode' | 'country' | 'location'
  | 'linkedin' | 'github' | 'website'
  | 'currentCompany' | 'currentTitle' | 'yearsExperience' | 'salaryExpectation' | 'noticePeriod' | 'startDate'
  | 'authorizedToWork' | 'needSponsorship' | 'willingToRelocate' | 'howDidYouHear'
  | 'gender' | 'ethnicity' | 'hispanic' | 'veteran' | 'disability'
  | 'resume' | 'coverLetter'
  | 'workTitle' | 'workCompany' | 'workLocation' | 'workStart' | 'workEnd' | 'workCurrent' | 'workDescription'
  | 'eduSchool' | 'eduDegree' | 'eduField' | 'eduStart' | 'eduEnd' | 'eduGpa'
  | 'acceptTerms';

export const KEY_PATTERNS: [Key, RegExp][] = [
  ['resume', /\b(resume|résumé|cv|curriculum vitae|lebenslauf)\b/i],
  ['coverLetter', /\bcover\s*letter|anschreiben|motivation letter\b/i],
  ['preferredName', /\b(preferred|nick)\s*(first\s*)?name\b|name you'?d prefer/i],
  ['firstName', /\b(first|given|fore)\s*name\b|^first$|\bvorname\b|legalnamesection_firstname/i],
  ['lastName', /\b(last|family|sur)\s*name\b|^last$|\bnachname\b|legalnamesection_lastname/i],
  ['fullName', /^\s*(full\s*)?name\s*\*?$|\bfull\s*name\b|your name|legal name/i],
  ['email', /e-?mail/i],
  ['phoneCountryCode', /country\s*(phone\s*)?code|phone\s*country|dial(ing)?\s*code|countryphonecode/i],
  ['phoneType', /phone\s*(device\s*)?type|phone-device-type/i],
  ['phone', /phone|mobile|telephone|telefon|cell/i],
  ['linkedin', /linked\s*in/i],
  ['github', /git\s*hub|gitlab/i],
  ['website', /website|portfolio|personal (site|url)|homepage|other url|\burl\b/i],
  ['address1', /address\s*(line)?\s*1|street|addressline1|^address$|anschrift|straße/i],
  ['postalCode', /postal|zip|post\s*code|postleitzahl|\bplz\b/i],
  ['city', /\bcity\b|town|\bort\b|stadt|addresssection_city/i],
  ['state', /\bstate\b|province|region|county|bundesland/i],
  ['needSponsorship', /sponsor(ship)?|visa\b|work permit.*(require|need)/i],
  ['authorizedToWork', /(legally\s*)?(authori[sz]ed|eligible|entitled|right)\s*to\s*work|work authori[sz]ation|arbeitserlaubnis/i],
  ['willingToRelocate', /relocat/i],
  ['country', /\bcountry\b|country of residence|countryregion|\bland\b/i],
  ['location', /current location|\blocation\b|where are you (based|located)|wohnort/i],
  ['currentCompany', /current (company|employer)|^company$|\borg\b|employer name/i],
  ['currentTitle', /current (job\s*)?title|current (role|position)/i],
  ['yearsExperience', /years of (relevant |professional )?experience|how many years/i],
  ['salaryExpectation', /salary|compensation|pay expectation|desired pay|gehaltsvorstellung/i],
  ['noticePeriod', /notice period|kündigungsfrist|when can you start|availability to start|earliest start/i],
  ['startDate', /\bstart date\b/i],
  ['howDidYouHear', /how did you (hear|find|learn)|source|referr(al|ed) by|where did you hear/i],
  ['hispanic', /hispanic|latino/i],
  ['gender', /\bgender\b|\bsex\b|geschlecht|pronoun/i],
  ['ethnicity', /\b(race|ethnicity|ethnic)\b/i],
  ['veteran', /veteran|military/i],
  ['disability', /disab/i],
  ['acceptTerms', /privacy (policy|notice)|i (agree|consent|acknowledge)|terms (and|&) conditions/i],
];

/** Keys inside a repeated work/education block (Workday "Work Experience 1" etc). */
export const WORK_PATTERNS: [Key, RegExp][] = [
  ['workCurrent', /currently work|i currently|current(ly)? (employed|role)|currentlyworkhere/i],
  ['workTitle', /job\s*title|\btitle\b|position|role/i],
  ['workCompany', /company|employer|organi[sz]ation/i],
  ['workLocation', /location|city/i],
  ['workStart', /\bfrom\b|start/i],
  ['workEnd', /\bto\b|end/i],
  ['workDescription', /description|responsibilit|summary|achievement/i],
];
export const EDU_PATTERNS: [Key, RegExp][] = [
  ['eduSchool', /school|university|college|institution|hochschule/i],
  ['eduDegree', /degree|qualification|abschluss/i],
  ['eduField', /field of study|major|discipline|subject|studienfach/i],
  ['eduGpa', /\bgpa\b|grade|overall result/i],
  ['eduStart', /\bfrom\b|start/i],
  ['eduEnd', /\bto\b|end|graduat/i],
];

/** Workday data-automation-id -> key (most reliable signal on Workday). */
export const WORKDAY_IDS: Record<string, Key> = {
  'legalNameSection_firstName': 'firstName', 'legalNameSection_lastName': 'lastName', 'email': 'email',
  'phone-number': 'phone', 'phone-device-type': 'phoneType', 'countryPhoneCode': 'phoneCountryCode',
  'addressSection_addressLine1': 'address1', 'addressSection_city': 'city', 'addressSection_postalCode': 'postalCode',
  'addressSection_countryRegion': 'state', 'countryDropdown': 'country', 'sourceDropdown': 'howDidYouHear',
  'jobTitle': 'workTitle', 'company': 'workCompany', 'location': 'workLocation', 'currentlyWorkHere': 'workCurrent', 'description': 'workDescription',
  'school': 'eduSchool', 'degree': 'eduDegree', 'fieldOfStudy': 'eduField', 'gpa': 'eduGpa',
  'file-upload-input-ref': 'resume', 'linkedinQuestion': 'linkedin', 'gender': 'gender', 'ethnicityDropdown': 'ethnicity', 'veteranStatus': 'veteran', 'disabilityStatus': 'disability',
};

export function classify(text: string, patterns: [Key, RegExp][] = KEY_PATTERNS): Key | null {
  for (const [k, re] of patterns) if (re.test(text)) return k;
  return null;
}
