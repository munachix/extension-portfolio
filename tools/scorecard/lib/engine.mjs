/**
 * Calculations + the keep/fix/kill rules from specs/12-SCORECARD.md.
 * Pure functions: give it rows, projects, rules and a date; get verdicts back.
 */

const DAY = 86400000;
const sum = (xs) => xs.reduce((a, b) => a + (b ?? 0), 0);
const known = (xs) => xs.filter((x) => x != null);
const pct = (a, b) => (b ? (a / b) * 100 : null);

/** Per-extension numbers. `rows` are that extension's weeks. */
export function computeMetrics(rows, project, asOf = new Date()) {
  const weeks = [...rows].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const latest = weeks[weeks.length - 1] ?? null;
  const prev = weeks[weeks.length - 2] ?? null;
  const last4 = weeks.slice(-4);
  const launch = project?.launchDate ? Date.parse(project.launchDate) : null;
  const days = launch != null ? Math.floor((asOf.getTime() - launch) / DAY) : null;
  const installs4 = sum(last4.map((w) => w.installs));
  const hours4 = sum(last4.map((w) => w.hours_spent));
  const revenue30 = latest?.revenue_30d_usd ?? 0;
  const impressions4 = known(last4.map((w) => w.impressions));
  const change = (k) => (latest?.[k] != null && prev?.[k] ? ((latest[k] - prev[k]) / prev[k]) * 100 : null);

  return {
    slug: project?.slug ?? latest?.slug,
    name: project?.name ?? latest?.slug,
    launched: launch != null && days >= 0,
    daysSinceLaunch: days,
    weeksSinceLaunch: days != null ? Math.floor(days / 7) : null,
    weeksOfData: weeks.length,
    latestWeek: latest?.week_start ?? null,
    impressions: latest?.impressions ?? null,
    impressionsAvg4: impressions4.length ? sum(impressions4) / impressions4.length : null,
    installs: latest?.installs ?? null,
    installsTotal: sum(weeks.map((w) => w.installs)),
    weeklyUsers: latest?.weekly_users ?? null,
    revenue30,
    sales30: latest?.sales_30d ?? 0,
    salesEver: Math.max(0, ...weeks.map((w) => w.sales_30d ?? 0)),
    rating: latest?.rating ?? null,
    ratingCount: latest?.rating_count ?? null,
    hours4,
    installRate: latest?.impressions ? pct(latest.installs ?? 0, latest.impressions) : null,
    paidConversion: installs4 ? pct(latest?.sales_30d ?? 0, installs4) : null,
    uninstallPct: installs4 ? pct(sum(last4.map((w) => w.uninstalls)), installs4) : null,
    revenuePerHour: hours4 ? revenue30 / hours4 : null,
    wow: { impressions: change('impressions'), installs: change('installs'), revenue: change('revenue_30d_usd') },
    listingRewrites: project?.listingRewrites ?? 0,
    history: weeks.slice(-12).map((w) => ({ week: w.week_start, impressions: w.impressions, installs: w.installs, revenue: w.revenue_30d_usd })),
  };
}

/** 🟢 ≥ $72, 🟡 ≥ $36, 🔴 below. */
export function revenueStatus(m, r) {
  if (m.revenue30 >= r.target) return 'green';
  if (m.revenue30 >= r.half) return 'yellow';
  return 'red';
}

/** Organic traffic from Chrome Web Store search. Final once the extension is `byWeek` weeks old. */
export function selfTraffic(m, r) {
  if (m.impressions == null) return { level: 'none', final: false };
  const t = r.selfTraffic;
  const level = m.impressions >= t.green ? 'green' : m.impressions >= t.yellow ? 'yellow' : 'red';
  return { level, final: (m.weeksSinceLaunch ?? 0) >= t.byWeek };
}

export function healthFlags(m, r) {
  const h = r.health;
  const flags = [];
  if (m.uninstallPct != null && m.uninstallPct > h.uninstallPct) flags.push({ id: 'uninstalls', text: `Uninstalls are ${Math.round(m.uninstallPct)}% of installs: something is broken or confusing`, action: 'Fix what’s broken: test the main flow and read recent reviews' });
  if (m.rating != null && (m.ratingCount ?? 0) >= h.minRatingCount && m.rating < h.minRating) flags.push({ id: 'rating', text: `Rating ${m.rating.toFixed(1)} is below ${h.minRating.toFixed(1)}`, action: 'Read every review and fix the top complaint first' });
  if (m.wow.impressions != null && m.wow.impressions < -h.impressionDropPct) flags.push({ id: 'impressions', text: `Impressions fell ${Math.round(-m.wow.impressions)}% this week`, action: 'Check whether the listing was flagged or a competitor launched' });
  return flags;
}

/**
 * The one recommended action, from the checkpoint table:
 *   Day 30 / Day 90 / Day 180 + revenue-per-hour rule + health flags.
 * verdict: keep (🟢) · fix (🟡) · freeze/stop (🔴) · early (⚪)
 */
export function decide(m, r) {
  const flags = healthFlags(m, r);
  const out = (verdict, action, why) => ({ verdict, action, why, flags });
  if (!m.launched) return out('early', 'Launch it', 'Not launched yet');
  if (m.weeksOfData === 0) return out('early', 'Add this week’s numbers', 'No data yet');

  const d = m.daysSinceLaunch;
  const rph = r.revenuePerHour;
  if (d >= rph.fromDay && m.hours4 > rph.maxHoursPerMonth && m.revenue30 < rph.revenueBelow) {
    return out('freeze', 'Freeze: fix only if it breaks', `${m.hours4}h of work in 4 weeks for $${m.revenue30.toFixed(0)}/mo costs more than it earns`);
  }

  let base;
  if (d >= 180) {
    if (m.revenue30 >= r.day180.winner) base = out('keep', 'Invest: add features, translate the listing, publish on Edge', `Winner: $${m.revenue30.toFixed(0)}/mo ≥ $${r.day180.winner}`);
    else if (m.revenue30 >= r.day180.stop) base = out('fix', 'One more improvement cycle', `$${m.revenue30.toFixed(0)}/mo is between $${r.day180.stop} and $${r.day180.winner}`);
    else base = out('stop', 'Stop work: keep it live, fix only if it breaks', `$${m.revenue30.toFixed(0)}/mo after 6 months is below $${r.day180.stop}`);
  } else if (d >= 90) {
    const t = r.day90;
    const lowTraffic = (m.impressionsAvg4 ?? 0) < t.minImpressions;
    if (m.revenue30 >= t.revenue || (m.weeklyUsers ?? 0) >= t.weeklyUsers) base = out('keep', 'Keep: on track, keep improving', m.revenue30 >= t.revenue ? `$${m.revenue30.toFixed(0)}/mo ≥ $${t.revenue}` : `${m.weeklyUsers} weekly users ≥ ${t.weeklyUsers}`);
    else if (lowTraffic && m.listingRewrites >= t.rewritesBeforeFreeze) base = out('freeze', 'Freeze: Chrome search isn’t sending people', `Under ${t.minImpressions} impressions/week after ${m.listingRewrites} listing rewrites`);
    else if (lowTraffic) base = out('fix', 'Rewrite title, summary & screenshots', `Under ${t.minImpressions} impressions/week (rewrite ${m.listingRewrites + 1} of ${t.rewritesBeforeFreeze})`);
    else base = out('fix', 'Move the paywall or change the price', 'Traffic is OK but sales are not');
  } else if (d >= 30) {
    const t = r.day30;
    if (m.installsTotal >= t.installs && m.salesEver >= t.sales) base = out('keep', 'Keep going', `${m.installsTotal} installs and ${m.salesEver} sale(s) by day 30`);
    else if (m.installsTotal < t.installs) base = out('fix', 'Rewrite title, summary & screenshots', `Only ${m.installsTotal} installs (goal ${t.installs})`);
    else base = out('fix', 'Move the paywall or change the price', `${m.installsTotal} installs but no sales yet`);
  } else {
    base = out('early', 'Too early: keep collecting numbers', `Day ${d} of 30`);
  }

  // A health problem is more urgent than growth advice, unless we've already stopped.
  if (flags.length && !['freeze', 'stop'].includes(base.verdict)) return { ...base, verdict: 'fix', action: flags[0].action, why: flags[0].text };
  return base;
}

/** Everything the report and dashboard need. */
export function scorecard(rows, projects, rules, asOf = new Date()) {
  const slugs = [...new Set([...projects.map((p) => p.slug), ...rows.map((r) => r.slug)])];
  const items = slugs.map((slug) => {
    const project = projects.find((p) => p.slug === slug) ?? { slug, name: slug };
    const m = computeMetrics(rows.filter((r) => r.slug === slug), project, asOf);
    return { ...m, status: revenueStatus(m, rules), traffic: selfTraffic(m, rules), ...decide(m, rules) };
  });
  const live = items.filter((i) => i.launched);
  const total = Math.round(sum(live.map((i) => i.revenue30)) * 100) / 100;
  const winners = live.filter((i) => i.revenue30 > rules.winner);
  return {
    asOf: asOf.toISOString().slice(0, 10),
    items,
    portfolio: {
      live: live.length,
      total,
      goal: live.length * rules.target,
      atTarget: live.filter((i) => i.revenue30 >= rules.target).length,
      winnerRule: winners.length ? { slugs: winners.map((w) => w.slug), text: `${winners.map((w) => w.name).join(', ')} passed $${rules.winner}/mo: pause new extensions for 2 weeks and grow the winner (features, languages, landing pages)` } : null,
    },
  };
}
