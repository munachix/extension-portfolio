import { describe, expect, it } from 'vitest';
import { Matcher, coreKey, jaroWinkler, normalize } from '../src/match/matcher';

describe('normalize', () => {
  it.each([
    ['Acme Limited', 'acme'], ['ACME LTD', 'acme'], ['Acme, Inc.', 'acme'], ['Philips B.V.', 'philips'], ['Foo L.L.C.', 'foo'],
    ['Smith & Jones LLP', 'smith and jones'], ['The Hut Group Ltd', 'hut group'], ['Société Générale S.A.', 'societe generale'],
    ['Google (UK) Limited', 'google uk'], ['Ernst & Young LLP', 'ernst and young'], ['Ltd', 'ltd'],
  ])('%s → %s', (a, b) => expect(normalize(a)).toBe(b));
  it('core key drops country words', () => {
    expect(coreKey('google uk')).toBe('google');
    expect(coreKey('amazon')).toBeNull();
  });
  it('jaro-winkler', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2);
    expect(jaroWinkler('acme', 'zeta')).toBeLessThan(0.7);
  });
});

describe('Matcher', () => {
  const m = new Matcher(['ACME LTD', 'Google (UK) Limited', 'Deliveroo Hop Ltd T/A Deliveroo', 'Monzo Bank Limited', 'Booking.com B.V.']);
  it('spec: "Acme Limited" matches "ACME LTD" exactly', () => expect(m.lookup('Acme Limited')).toMatchObject({ kind: 'exact', rows: [0] }));
  it('"Google" is a likely match for "Google (UK) Limited"', () => expect(m.lookup('Google')).toMatchObject({ kind: 'likely', rows: [1] }));
  it('trading names are indexed', () => expect(m.lookup('Deliveroo')).toMatchObject({ kind: 'exact', rows: [2] }));
  it('near-identical spellings are likely matches', () => expect(m.lookup('Monzo Bnak Ltd')?.kind).toBe('likely'));
  it('punctuation-insensitive', () => expect(m.lookup('Booking.com')).toMatchObject({ kind: 'exact', rows: [4] }));
  it('registered names beat trading names', () => {
    const mm = new Matcher(['Maxico Uk limited t/a The Amazon', 'Amazon UK Services Ltd.']);
    expect(mm.lookup('Amazon')).toMatchObject({ kind: 'likely', rows: [1] });
  });
  it('a brand matches the registered name that starts with it', () => {
    expect(m.lookup('Monzo')).toMatchObject({ kind: 'likely', rows: [3] });
  });
  it('names written without spaces (live LinkedIn: "JPMorganChase")', () => {
    const mm = new Matcher(['JPMorgan Chase Bank, National Association', 'JP Morgan Travel Ltd']);
    expect(mm.lookup('JPMorganChase')).toMatchObject({ kind: 'likely', rows: [0] });
    expect(mm.lookup('JPMorganChaseX')).toBeNull();
  });
  it('unrelated names do not match', () => {
    expect(m.lookup('Acne Studios')).toBeNull();
    expect(m.lookup('')).toBeNull();
  });
});
