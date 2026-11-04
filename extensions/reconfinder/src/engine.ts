/**
 * Reconciliation discrepancy finder. All amounts in integer cents.
 * QBO: Difference = Statement ending balance − Cleared balance.
 * Deposits are positive, payments negative.
 *   - checking an uncleared tx a: difference becomes D − a  → fixes if a = D
 *   - unchecking a cleared tx a:  difference becomes D + a  → fixes if a = −D
 *   - flipping a cleared tx's sign: D + 2a                  → fixes if a = −D/2
 *   - correcting a cleared tx a → b: D − (b − a)            → fixes if b − a = D
 */
export interface Tx { id: string; date: string; payee: string; amount: number; cleared: boolean }
export type Action = { id: string; do: 'check' | 'uncheck' | 'fix'; to?: number };
export interface Suggestion { kind: 'single' | 'sign' | 'transposition' | 'duplicate' | 'combo' | 'missing'; title: string; detail: string; actions: Action[]; score: number }

export const fmt = (c: number) => `${c < 0 ? '−' : ''}$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const toCents = (s: string): number | null => {
  const t = s.replace(/[\s$,]/g, '').replace(/^\((.*)\)$/, '-$1').replace(/[−–]/g, '-');
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
};
const who = (t: Tx) => `${t.date ? `${t.date} ` : ''}${t.payee || 'transaction'} ${fmt(t.amount)}`;

/** All amounts reachable by swapping two adjacent digits of |a|, keeping the sign. */
export function transpositions(a: number): number[] {
  const s = String(Math.abs(a));
  const out = new Set<number>();
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === s[i + 1]) continue;
    const t = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    out.add(Math.sign(a || 1) * Number(t));
  }
  out.delete(a);
  return [...out];
}

export function findCauses(txs: Tx[], diff: number, opts: { combos?: boolean; maxCombo?: 2 | 3; limit?: number } = {}): Suggestion[] {
  const out: Suggestion[] = [];
  if (diff === 0) return out;
  const cleared = txs.filter((t) => t.cleared), open = txs.filter((t) => !t.cleared);
  const add = (s: Suggestion) => { if (!out.some((o) => o.actions.map((a) => a.id + a.do).sort().join() === s.actions.map((a) => a.id + a.do).sort().join())) out.push(s); };

  // 1. duplicates first: "entered twice" is a clearer explanation than "ticked by mistake": same amount and payee within 3 days, both ticked
  const byKey = new Map<string, Tx[]>();
  for (const t of cleared) { const k = `${t.amount}|${t.payee.toLowerCase()}`; byKey.set(k, [...(byKey.get(k) ?? []), t]); }
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const [a, b] = list;
    const days = Math.abs(Date.parse(a.date) - Date.parse(b.date)) / 86400000;
    if (!Number.isNaN(days) && days > 3) continue;
    const fixes = b.amount === -diff;
    add({ kind: 'duplicate', title: `Entered twice?: ${who(b)}`, detail: fixes ? 'Unticking one copy makes the difference $0.00.' : 'Same amount and payee, both ticked.', actions: [{ id: b.id, do: 'uncheck' }], score: fixes ? 92 : 40 });
  }

  // 2. one transaction
  for (const t of open) if (t.amount === diff) add({ kind: 'single', title: `Not ticked yet: ${who(t)}`, detail: 'Ticking it makes the difference $0.00.', actions: [{ id: t.id, do: 'check' }], score: 100 });
  for (const t of cleared) if (t.amount === -diff) add({ kind: 'single', title: `Ticked by mistake?: ${who(t)}`, detail: 'Unticking it makes the difference $0.00. Check it’s on this statement.', actions: [{ id: t.id, do: 'uncheck' }], score: 95 });

  // 2. sign entered the wrong way (half the difference)
  if (diff % 2 === 0) for (const t of cleared) if (t.amount === -diff / 2) add({ kind: 'sign', title: `Wrong sign?: ${who(t)}`, detail: `If this was really a ${t.amount < 0 ? 'deposit' : 'payment'} of ${fmt(Math.abs(t.amount))}, the difference is $0.00.`, actions: [{ id: t.id, do: 'fix', to: -t.amount }], score: 90 });

  // 3. two digits swapped (differences divisible by 9)
  if (Math.abs(diff) % 9 === 0) for (const t of cleared) for (const b of transpositions(t.amount)) if (b - t.amount === diff) add({ kind: 'transposition', title: `Digits swapped?: ${who(t)}`, detail: `Entered ${fmt(t.amount)}, the statement may say ${fmt(b)}.`, actions: [{ id: t.id, do: 'fix', to: b }], score: 85 });

  // 5. combinations (Pro): uncleared to tick, cleared to untick, or one of each
  if (opts.combos) {
    // effect of an action on the difference: tick a → −a, untick a → +a; need total effect = −diff
    const moves = [...open.map((t) => ({ t, do: 'check' as const, eff: -t.amount })), ...cleared.map((t) => ({ t, do: 'uncheck' as const, eff: t.amount }))];
    const need = -diff;
    const byEff = new Map<number, number[]>();
    moves.forEach((m, i) => byEff.set(m.eff, [...(byEff.get(m.eff) ?? []), i]));
    const found: number[][] = [];
    for (let i = 0; i < moves.length && found.length < 30; i++) {
      for (const j of byEff.get(need - moves[i].eff) ?? []) if (j > i && moves[j].t.id !== moves[i].t.id) found.push([i, j]);
    }
    if ((opts.maxCombo ?? 3) >= 3 && moves.length <= 800) {
      for (let i = 0; i < moves.length && found.length < 60; i++) for (let j = i + 1; j < moves.length && found.length < 60; j++) {
        for (const k of byEff.get(need - moves[i].eff - moves[j].eff) ?? []) if (k > j) found.push([i, j, k]);
      }
    }
    for (const c of found) {
      const ms = c.map((i) => moves[i]);
      if (new Set(ms.map((m) => m.t.id)).size !== ms.length) continue;
      add({ kind: 'combo', title: ms.map((m) => `${m.do === 'check' ? 'Tick' : 'Untick'} ${who(m.t)}`).join(' + '), detail: `Together these make the difference $0.00.`, actions: ms.map((m) => ({ id: m.t.id, do: m.do })), score: 70 - ms.length * 5 });
    }
  }

  if (!out.some((s) => s.score >= 85)) add({ kind: 'missing', title: `Missing from QuickBooks?: a ${diff > 0 ? 'deposit' : 'payment'} of ${fmt(Math.abs(diff))}`, detail: 'No transaction on screen explains it. Look for this amount on the bank statement: it may not be entered yet, or it’s in a different period.', actions: [], score: 10 });
  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 25);
}

/** Paste mode: "amount" or "date, payee, amount, ✓" per line. Ticked = contains ✓, x, y, yes, cleared, R or C column. */
export function parsePasted(text: string): Tx[] {
  const out: Tx[] = [];
  text.split(/\r?\n/).forEach((line, n) => {
    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)|;/).map((c) => c.replace(/^"|"$/g, '').trim()).filter((c) => c !== '');
    if (!cells.length) return;
    const amounts = cells.map(toCents);
    const ai = amounts.map((a, i) => (a != null && /[\d]/.test(cells[i]) && !/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(cells[i]) && !/^\d{4}-\d{2}-\d{2}$/.test(cells[i]) ? i : -1)).filter((i) => i >= 0);
    if (!ai.length) return;
    // Payment/Deposit columns: two numbers where one is blank are handled by taking the last number; payments negative if in a "payment" position
    const i = ai[ai.length - 1];
    const amount = amounts[i]!;
    const date = cells.find((c) => /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{4}-\d{2}-\d{2}$/.test(c)) ?? '';
    const payee = cells.filter((c, k) => k !== i && c !== date && toCents(c) == null && !/^(✓|x|y|yes|cleared|r|c)$/i.test(c)).join(' ').slice(0, 60);
    const cleared = cells.some((c) => /^(✓|✔|x|y|yes|cleared|r|c)$/i.test(c));
    out.push({ id: `p${n}`, date, payee, amount, cleared });
  });
  return out;
}
