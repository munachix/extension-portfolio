import { describe, expect, it } from 'vitest';
import { parseCvText } from '../src/profile/parse-cv';
import { emptyProfile, parseMonth, yearsOfExperience } from '../src/profile/schema';
import { classify, WORK_PATTERNS } from '../src/fill/keys';
import { bestOption } from '../src/fill/match';
import { wantFor } from '../src/fill/values';
import { findAnswer, similarity, upsert } from '../src/answers/bank';
import { truthGuard } from '../src/ai/truth';
import { keywordMatch } from '../src/resume/keywords';

const CV = `Jane Doe
Austin, TX | jane.doe@example.com | +1 512 555 0142 | linkedin.com/in/janedoe | github.com/janedoe

Summary
Backend engineer with 6 years building payment systems.

Experience
Senior Software Engineer
Stripe | Remote
Jan 2021 – Present
• Led migration of 40 services to Kubernetes
• Cut p99 latency by 35%
Software Engineer, Square
Jun 2018 – Dec 2020
• Built fraud scoring in Python

Education
B.Sc. Computer Science, University of Texas at Austin
2014 – 2018

Skills
Python, Go, PostgreSQL, Kubernetes, AWS, Kafka
`;

describe('CV parsing', () => {
  const p = parseCvText(CV);
  it('contact details', () => {
    expect(p).toMatchObject({ firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phoneCountryCode: '1', city: 'Austin', state: 'TX' });
    expect(p.linkedin).toContain('linkedin.com/in/janedoe');
    expect(p.github).toContain('github.com/janedoe');
  });
  it('work history with dates', () => {
    expect(p.work).toHaveLength(2);
    expect(p.work[0]).toMatchObject({ title: 'Senior Software Engineer', company: 'Stripe', start: '2021-01', current: true });
    expect(p.work[0].description).toContain('Kubernetes');
    expect(p.work[1]).toMatchObject({ title: 'Software Engineer', company: 'Square', start: '2018-06', end: '2020-12', current: false });
  });
  it('education and skills', () => {
    expect(p.education[0]).toMatchObject({ school: 'University of Texas at Austin', degree: 'B.Sc. Computer Science', start: '2014', end: '2018' });
    expect(p.skills).toEqual(['Python', 'Go', 'PostgreSQL', 'Kubernetes', 'AWS', 'Kafka']);
  });
  it('years of experience', () => {
    expect(yearsOfExperience(p, new Date('2026-11-01'))).toBe(8);
    expect(parseMonth('Mar 2021')).toEqual({ y: 2021, m: 3 });
  });
});

describe('field recognition', () => {
  it.each([
    ['First Name*', 'firstName'], ['Legal last name', 'lastName'], ['Email address', 'email'], ['Phone', 'phone'], ['Country phone code', 'phoneCountryCode'],
    ['LinkedIn Profile', 'linkedin'], ['Resume/CV', 'resume'], ['Will you now or in the future require sponsorship for a visa?', 'needSponsorship'],
    ['Are you legally authorized to work in the United States?', 'authorizedToWork'], ['What is your current country of residence?', 'country'],
    ['Current company', 'currentCompany'], ['How did you hear about us?', 'howDidYouHear'], ['Are you Hispanic/Latino?', 'hispanic'], ['Veteran Status', 'veteran'],
    ['Desired salary', 'salaryExpectation'], ['Vorname', 'firstName'], ['I agree to the privacy policy', 'acceptTerms'],
  ])('%s → %s', (label, key) => expect(classify(label)).toBe(key));
  it('work block fields', () => {
    expect(classify('Job Title*', WORK_PATTERNS)).toBe('workTitle');
    expect(classify('I currently work here', WORK_PATTERNS)).toBe('workCurrent');
  });
});

describe('option choice', () => {
  it('yes/no and decline', () => {
    expect(bestOption(['Select...', 'Yes, I am authorized', 'No'], ['Yes'])).toBe(1);
    expect(bestOption(['Male', 'Female', 'I don’t wish to answer'], wantFor('gender', emptyProfile())!.choice!)).toBe(2);
  });
  it('countries with aliases', () => {
    const p = { ...emptyProfile(), country: 'United States' };
    expect(bestOption(['Canada', 'United States of America', 'United Kingdom'], wantFor('country', p)!.choice!)).toBe(1);
  });
  it('consent is never filled', () => expect(wantFor('acceptTerms', emptyProfile())).toBeNull());
});

describe('answer bank', () => {
  const bank = upsert([], 'Why do you want to work at Acme?', 'Because…');
  it('finds similar questions', () => {
    expect(findAnswer(bank, 'Why do you want to work here?')?.answer).toBe('Because…');
    expect(findAnswer(bank, 'What is your favourite programming language?')).toBeNull();
    expect(similarity('Describe a challenge you overcame', 'Tell us about a challenge you overcame at work')).toBeGreaterThan(0.6);
  });
});

describe('truth guard', () => {
  const profile = 'Stripe Square Kubernetes 40 services 35% Python';
  it('passes facts from the profile', () => expect(truthGuard('Led the migration of 40 services to Kubernetes at Stripe.', profile).ok).toBe(true));
  it('flags invented employers and numbers', () => {
    const r = truthGuard('Led a team of 12 engineers at Google.', profile);
    expect(r.ok).toBe(false);
    expect(r.sentences[0].unknown).toEqual(expect.arrayContaining(['12', 'Google']));
  });
});

describe('keyword match', () => {
  it('scores and lists missing keywords by frequency', () => {
    const r = keywordMatch('We need Python, SQL and Tableau. SQL daily. Python too.', 'I use Python.');
    expect(r.found).toEqual(['python']);
    expect(r.missing.map((m) => m.term)).toEqual(['sql', 'tableau']);
    expect(r.score).toBeGreaterThan(30);
  });
});
