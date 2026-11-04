/** Terminal table. */
const DOT = { green: '🟢', yellow: '🟡', red: '🔴', none: '⚪' };
const VERDICT = { keep: '🟢 Keep', fix: '🟡 Fix', freeze: '🔴 Freeze', stop: '🔴 Stop', early: '⚪ Early' };
const money = (n) => `$${(n ?? 0).toFixed(0)}`;

// Emoji are 2 columns wide in terminals.
const width = (s) => [...s].reduce((w, ch) => w + (/\p{Extended_Pictographic}/u.test(ch) ? 2 : ch === '️' ? 0 : 1), 0);
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - width(s)));

export function formatReport(card, rules) {
  const head = ['Extension', 'vs $' + rules.target, 'Revenue 30d', 'Self-traffic', 'Day', 'Verdict', 'Action'];
  const rows = card.items.map((i) => [
    i.name,
    i.launched ? DOT[i.status] : '⚪',
    money(i.revenue30),
    i.impressions == null ? '⚪ no data' : `${DOT[i.traffic.level]} ${i.impressions}/wk${i.traffic.final ? '' : ' (early)'}`,
    i.daysSinceLaunch == null ? '—' : String(i.daysSinceLaunch),
    VERDICT[i.verdict],
    i.action,
  ]);
  const widths = head.map((h, c) => Math.max(width(h), ...rows.map((r) => width(r[c]))));
  const line = (cells) => cells.map((c, k) => pad(c, widths[k])).join('  ');
  const out = [line(head), widths.map((w) => '─'.repeat(w)).join('  '), ...rows.map(line)];

  const notes = card.items.flatMap((i) => [
    i.why && i.launched ? `  ${i.name}: ${i.why}` : null,
    ...i.flags.filter((f) => f.text !== i.why).map((f) => `  ⚠ ${i.name}: ${f.text}`),
  ]).filter(Boolean);
  if (notes.length) out.push('', 'Why:', ...notes);

  const p = card.portfolio;
  out.push('', `Portfolio: ${money(p.total)}/mo from ${p.live} live extension(s). Goal ${money(p.goal)} ($${rules.target} each). ${p.atTarget} at target.`);
  if (p.winnerRule) out.push(`🏆 ${p.winnerRule.text}`);
  return out.join('\n');
}
