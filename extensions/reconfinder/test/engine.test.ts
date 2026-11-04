import { describe, expect, it } from 'vitest';
import { findCauses, parsePasted, toCents, transpositions, type Tx } from '../src/engine';

const tx = (id: string, amount: number, cleared: boolean, payee = id, date = '2026-10-05'): Tx => ({ id, amount, cleared, payee, date });
const base = [tx('rent', -150000, true), tx('client', 420000, true), tx('fee', -2500, true), tx('coffee', -1275, false), tx('refund', 8900, false)];

describe('findCauses', () => {
  it('an uncleared deposit equal to the difference → tick it', () => {
    const s = findCauses(base, 8900);
    expect(s[0]).toMatchObject({ kind: 'single', actions: [{ id: 'refund', do: 'check' }] });
  });
  it('a cleared payment that should not be → untick it', () => {
    expect(findCauses(base, 2500)[0]).toMatchObject({ kind: 'single', actions: [{ id: 'fee', do: 'uncheck' }] });
  });
  it('sign error shows as half the difference', () => {
    expect(findCauses(base, 5000)[0]).toMatchObject({ kind: 'sign', actions: [{ id: 'fee', do: 'fix', to: 2500 }] });
  });
  it('transposition: $1,500.00 entered, statement says $1,050.00 → difference $450', () => {
    // rent should be −105000 not −150000 → cleared balance too low by 45000 → D = +45000
    expect(findCauses(base, 45000).find((s) => s.kind === 'transposition')).toMatchObject({ actions: [{ id: 'rent', do: 'fix', to: -105000 }] });
    expect(transpositions(-150000)).toContain(-105000);
  });
  it('duplicates', () => {
    const d = [...base, tx('fee2', -2500, true, 'fee', '2026-10-06')];
    expect(findCauses(d, 2500).some((s) => s.kind === 'duplicate' && s.score >= 90)).toBe(true);
  });
  it('combos only with Pro, and they really add up', () => {
    expect(findCauses(base, 8900 - 1275).some((s) => s.kind === 'combo')).toBe(false);
    const s = findCauses(base, 8900 - 1275, { combos: true }).find((x) => x.kind === 'combo')!;
    expect(s.actions.map((a) => a.id).sort()).toEqual(['coffee', 'refund']);
  });
  it('nothing explains it → probably missing', () => {
    expect(findCauses(base, 123)[0].kind).toBe('missing');
  });
  it('zero difference → nothing to do', () => expect(findCauses(base, 0)).toEqual([]));
});

describe('parsing', () => {
  it('money', () => { expect(toCents('$1,234.50')).toBe(123450); expect(toCents('(25.00)')).toBe(-2500); expect(toCents('−12.75')).toBe(-1275); expect(toCents('abc')).toBeNull(); });
  it('pasted lines', () => {
    const t = parsePasted('10/05/2026\tStaples\t-25.00\t✓\n10/07/2026, Client A, 4200.00\n89.00');
    expect(t.map((x) => [x.date, x.payee, x.amount, x.cleared])).toEqual([['10/05/2026', 'Staples', -2500, true], ['10/07/2026', 'Client A', 420000, false], ['', '', 8900, false]]);
  });
  it('500 transactions with combos stays fast', () => {
    const many = Array.from({ length: 500 }, (_, i) => tx(`t${i}`, ((i * 7919) % 50000) - 25000, i % 2 === 0));
    const t0 = performance.now();
    findCauses(many, 12345, { combos: true });
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
