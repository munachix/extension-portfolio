import { describe, expect, it } from 'vitest';
import { detect, detectCard, type Profile } from '../src/engine/detect';
import { findMentions, includesCountry } from '../src/engine/places';
import { splitSentences } from '../src/engine/sentences';
import { findTimeZones, localWindow } from '../src/engine/timezones';

const NG: Profile = { country: 'NG', timeZone: 'Africa/Lagos' };
const US: Profile = { country: 'US', timeZone: 'America/New_York' };
const DE: Profile = { country: 'DE', timeZone: 'Europe/Berlin' };
const AU: Profile = { country: 'AU', timeZone: 'Australia/Sydney' };
const NZ: Profile = { country: 'NZ', timeZone: 'Pacific/Auckland' };
const IN: Profile = { country: 'IN', timeZone: 'Asia/Kolkata' };
const JAN = new Date('2026-01-15T12:00:00Z');

const status = (text: string, p: Profile, extra: { locationText?: string; structuredLocations?: string[] } = {}) => detect({ text, ...extra }, p, undefined, JAN).status;

describe('spec acceptance tests', () => {
  it('"open to US residents only" is red, with the sentence as evidence', () => {
    const text = 'We are a fast-growing startup. This role is open to US residents only. Apply now!';
    const v = detect({ text }, NG);
    expect(v.status).toBe('red');
    expect(v.reason).toContain('United States');
    const e = v.evidence.find((x) => x.effect === 'red')!;
    expect(text.slice(e.start, e.end)).toBe('This role is open to US residents only.');
  });
  it('"We hire worldwide" is green', () => {
    expect(status('We hire worldwide. Great benefits.', NG)).toBe('green');
  });
  it('no location mentioned is yellow', () => {
    expect(status('We build great software with TypeScript and Postgres.', NG)).toBe('yellow');
  });
});

describe('restrictions', () => {
  it.each([
    ['Candidates must reside in the United States.', 'red'],
    ['You must be authorized to work in the US.', 'red'],
    ['US citizens only.', 'red'],
    ['This is a W-2 position.', 'red'],
    ['Remote (US)', 'red'],
    ['Location: USA', 'red'],
    ['Remote within the EU', 'red'],
    ['Must live in EMEA.', 'green'],
    ['We are hiring in Nigeria, Kenya and Ghana.', 'green'],
    ['Open to candidates based in Africa.', 'green'],
    ['Remote – LATAM only', 'red'],
    ['Must be authorized to work in the U.S. or Canada.', 'red'],
    ['Work from anywhere in the US.', 'red'],
    ['We hire worldwide, but this role requires the right to work in the UK.', 'red'],
  ])('%s → %s (Nigeria)', (text, want) => {
    expect(status(text, NG)).toBe(want);
  });

  it('US user is green for US-only jobs', () => {
    expect(status('This role is open to US residents only.', US)).toBe('green');
    expect(status('Must be authorized to work in the U.S. or Canada.', US)).toBe('green');
  });

  it('exclusions only hit the excluded country', () => {
    expect(status('Open worldwide, except India and Pakistan.', IN)).toBe('red');
    expect(status('Open worldwide, except India and Pakistan.', NG)).toBe('green');
  });

  it("doesn't treat the company's own location as a restriction", () => {
    expect(status("We're a Berlin-based company with customers worldwide.", NG)).toBe('yellow');
    expect(status('Our headquarters are located in New York.', NG)).toBe('yellow');
  });

  it('"worldwide leader" is not a worldwide-hiring phrase', () => {
    expect(status('We are the worldwide leader in payments.', NG)).toBe('yellow');
  });

  it('mixed signals are yellow', () => {
    expect(status('Open to candidates in Africa. You must be authorized to work in the US.', NG)).toBe('yellow');
  });
});

describe('German job posts', () => {
  it.each([
    ['Remote aus Deutschland möglich.', DE, 'green'],
    ['Remote aus Deutschland möglich.', NG, 'red'],
    ['Wohnsitz in Deutschland erforderlich.', NG, 'red'],
    ['Eine gültige Arbeitserlaubnis für die EU ist Voraussetzung.', NG, 'red'],
    ['Eine gültige Arbeitserlaubnis für die EU ist Voraussetzung.', DE, 'green'],
    ['Du arbeitest ortsunabhängig – von überall.', NG, 'green'],
    ['Du arbeitest ortsunabhängig innerhalb Deutschlands.', NG, 'red'],
    ['Homeoffice in ganz Österreich.', DE, 'red'],
    ['Mobiles Arbeiten innerhalb der DACH-Region.', DE, 'green'],
  ])('%s → %s', (text, p, want) => {
    expect(status(text, p as Profile)).toBe(want);
  });
});

describe('Australia & New Zealand', () => {
  it.each([
    ['Applicants must have full working rights in Australia.', NG, 'red'],
    ['Applicants must have full working rights in Australia.', AU, 'green'],
    ['Australian citizens or permanent residents only.', NZ, 'red'],
    ['Must be based in NZ.', NZ, 'green'],
    ['Remote across ANZ.', NZ, 'green'],
    ['Remote across ANZ.', NG, 'red'],
    ['Open to candidates in Sydney or Melbourne.', AU, 'green'],
  ])('%s → %s', (text, p, want) => {
    expect(status(text, p as Profile)).toBe(want);
  });

  it('SEEK location field counts', () => {
    expect(status('Great team, great culture.', NG, { locationText: 'Auckland CBD, Auckland (Remote)' })).toBe('red');
    expect(status('Great team, great culture.', NZ, { locationText: 'Auckland CBD, Auckland (Remote)' })).toBe('green');
  });
});

describe('location fields and cards', () => {
  it('WWR "Anywhere in the World" is green', () => {
    expect(detectCard('Anywhere in the World', NG).status).toBe('green');
  });
  it('WWR country tags', () => {
    expect(detectCard('Full-Time · 🇦🇹 Austria · 🇧🇪 Belgium · 🇨🇿 Czechia', NG).status).toBe('red');
    expect(detectCard('Full-Time · 🇦🇹 Austria · 🇧🇪 Belgium · 🇨🇿 Czechia', { country: 'BE', timeZone: null }).status).toBe('green');
  });
  it('LinkedIn "United States (Remote)"', () => {
    expect(detectCard('United States (Remote)', NG).status).toBe('red');
  });
  it('description "worldwide" beats a location field', () => {
    expect(status('You can work from anywhere.', NG, { locationText: 'United States' })).toBe('green');
  });
  it('JSON-LD applicant locations are a hard rule', () => {
    expect(status('We see no borders.', NG, { structuredLocations: ['Canada'] })).toBe('red');
  });
});

describe('time zones', () => {
  it('a UTC band outside the user is red', () => {
    expect(status('Candidates must be within UTC-3 to UTC+3.', IN)).toBe('red');
    expect(status('Candidates must be within UTC-3 to UTC+3.', NG)).toBe('yellow');
  });
  it('"within 2 hours of CET"', () => {
    const tz = findTimeZones('You should be within 2 hours of CET.', 0, JAN);
    expect(tz[0].band).toEqual([-60, 180]);
  });
  it('reads hours and overlap, and converts to the user zone', () => {
    const [tz] = findTimeZones('You need 4 hours of overlap with 9am-5pm EST.', 0, JAN);
    expect(tz.zone).toBe('America/New_York');
    expect(tz.hours).toEqual([9, 17]);
    expect(tz.overlapHours).toBe(4);
    const w = localWindow(tz, 'Africa/Lagos', JAN)!;
    expect(w.from).toBe('3:00 PM');
    expect(w.to).toBe('11:00 PM');
    expect(w.overlapTo).toBe('7:00 PM');
  });
  it('does not read "PT" as a time zone without time context', () => {
    expect(findTimeZones('This is a PT role with flexible duties.', 0, JAN)).toHaveLength(0);
  });
});

describe('places & sentences', () => {
  it('longest name wins', () => {
    expect(findMentions('Based in New Mexico').map((m) => m.code)).toEqual(['US']);
    expect(findMentions('Latin America').map((m) => m.code)).toEqual(['LATAM']);
  });
  it('"US" is case-sensitive, so "join us" is not the United States', () => {
    expect(findMentions('Come join us in building').length).toBe(0);
  });
  it('regions contain their countries', () => {
    expect(includesCountry('EMEA', 'NG')).toBe(true);
    expect(includesCountry('EU', 'GB')).toBe(false);
    expect(includesCountry('APAC', 'NZ')).toBe(true);
  });
  it('does not split on "U.S."', () => {
    expect(splitSentences('Open to U.S. residents only. Thanks.').map((s) => s.text)).toEqual(['Open to U.S. residents only.', 'Thanks.']);
  });
  it('custom rules', () => {
    expect(detect({ text: 'Must be a W-9 contractor.' }, NG, { red: ['W-9'], green: [] }).status).toBe('red');
  });
  it('unset country', () => {
    expect(detect({ text: 'US only' }, { country: null, timeZone: null }).status).toBe('unset');
  });
});
