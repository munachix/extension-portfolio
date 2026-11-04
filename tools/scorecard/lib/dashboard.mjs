/**
 * Self-contained dashboard.html (works offline, no libraries).
 * Data is embedded as JSON; a small script draws the charts and hover tooltips.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${Math.round(n ?? 0).toLocaleString('en-US')}`;
const VERDICT = {
  keep: ['good', '✓', 'Keep'], fix: ['warning', '!', 'Fix'], freeze: ['critical', '✕', 'Freeze'], stop: ['critical', '✕', 'Stop'], early: ['neutral', '•', 'Early'],
};
const LEVEL = { green: ['good', '✓'], yellow: ['warning', '!'], red: ['critical', '✕'], none: ['neutral', '•'] };
const pill = (kind, icon, label) => `<span class="pill ${kind}"><span class="ic" aria-hidden="true">${icon}</span>${esc(label)}</span>`;

function card(i, rules) {
  const [vk, vi, vl] = VERDICT[i.verdict];
  const [rk, ri] = LEVEL[i.launched ? i.status : 'none'];
  const [tk, ti] = LEVEL[i.traffic.level];
  const pct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const rows = i.history.map((h) => `<tr><td>${esc(h.week)}</td><td>${h.impressions ?? '—'}</td><td>${h.installs ?? '—'}</td><td>${h.revenue == null ? '—' : money(h.revenue)}</td></tr>`).join('');
  return `
<article class="card">
  <header class="card-h">
    <h2>${esc(i.name)}</h2>
    ${pill(vk, vi, vl)}
  </header>
  <p class="action">${esc(i.action)}</p>
  ${i.why ? `<p class="why">${esc(i.why)}</p>` : ''}
  ${i.flags.map((f) => `<p class="flag">${pill('critical', '!', 'Health')} ${esc(f.text)}</p>`).join('')}
  <dl class="kpis">
    <div><dt>Revenue, 30 days</dt><dd>${money(i.revenue30)} ${pill(rk, ri, i.launched ? `vs $${rules.target}` : 'not live')}</dd></div>
    <div><dt>Self-traffic</dt><dd>${i.impressions == null ? '—' : `${i.impressions.toLocaleString('en-US')}/wk`} ${pill(tk, ti, i.traffic.level === 'none' ? 'no data' : i.traffic.final ? i.traffic.level : `${i.traffic.level} (early)`)}</dd></div>
    <div><dt>Day</dt><dd>${i.daysSinceLaunch ?? '—'}</dd></div>
    <div><dt>Install rate</dt><dd>${pct(i.installRate)}</dd></div>
    <div><dt>Paid conversion</dt><dd>${pct(i.paidConversion)}</dd></div>
    <div><dt>Uninstalls</dt><dd>${pct(i.uninstallPct)}</dd></div>
    <div><dt>Rating</dt><dd>${i.rating == null ? '—' : `${i.rating.toFixed(1)} (${i.ratingCount ?? 0})`}</dd></div>
    <div><dt>$ per hour</dt><dd>${i.revenuePerHour == null ? '—' : money(i.revenuePerHour)}</dd></div>
  </dl>
  ${i.history.length ? `
  <div class="charts">
    <figure><figcaption>Impressions per week</figcaption><div class="chart" data-slug="${esc(i.slug)}" data-key="impressions"></div></figure>
    <figure><figcaption>Installs per week</figcaption><div class="chart" data-slug="${esc(i.slug)}" data-key="installs"></div></figure>
    <figure><figcaption>Revenue, last 30 days <span class="muted">(dashed line: $${rules.target})</span></figcaption><div class="chart" data-slug="${esc(i.slug)}" data-key="revenue" data-target="${rules.target}" data-money="1"></div></figure>
  </div>
  <details><summary>Show the numbers as a table</summary>
    <table><thead><tr><th>Week</th><th>Impressions</th><th>Installs</th><th>Revenue 30d</th></tr></thead><tbody>${rows}</tbody></table>
  </details>` : '<p class="muted">No weekly numbers yet.</p>'}
</article>`;
}

export function renderDashboard(sc, rules, { sample = false } = {}) {
  const p = sc.portfolio;
  const share = p.goal ? Math.min(100, (p.total / p.goal) * 100) : 0;
  const data = Object.fromEntries(sc.items.map((i) => [i.slug, i.history]));
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Extension Scorecard</title>
<style>
:root {
  color-scheme: light;
  --surface-0: #f4f4f2; --surface-1: #fcfcfb; --border: #e2e1dc;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #77766f; --grid: #e7e6e1;
  --series-1: #2a78d6; --target: #77766f;
  --good: #0ca30c; --warning: #fab219; --critical: #d03b3b; --neutral: #9b9a93;
  --good-ink: #006300; --warning-ink: #7a5200; --critical-ink: #a32323;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
    --surface-0: #121211; --surface-1: #1a1a19; --border: #33332f;
    --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #9b9a91; --grid: #2c2c29;
    --series-1: #3987e5; --target: #9b9a91;
    --good-ink: #5fd35f; --warning-ink: #fab219; --critical-ink: #ff8a8a;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface-0: #121211; --surface-1: #1a1a19; --border: #33332f;
  --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #9b9a91; --grid: #2c2c29;
  --series-1: #3987e5; --target: #9b9a91;
  --good-ink: #5fd35f; --warning-ink: #fab219; --critical-ink: #ff8a8a;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--surface-0); color: var(--text-primary); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 56px; }
h1 { font-size: 24px; margin: 0; }
.sub { color: var(--text-secondary); margin: 4px 0 20px; }
.banner { background: var(--surface-1); border: 1px solid var(--border); border-left: 4px solid var(--warning); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
.tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
.tile .label { color: var(--text-secondary); font-size: 13px; }
.tile .value { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; }
.meter { height: 8px; border-radius: 4px; background: var(--grid); overflow: hidden; margin-top: 8px; }
.meter > span { display: block; height: 100%; background: var(--series-1); border-radius: 4px; }
.cards { display: grid; gap: 16px; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.card-h { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
.card h2 { font-size: 18px; margin: 0; }
.action { font-size: 17px; font-weight: 650; margin: 10px 0 2px; }
.why, .muted { color: var(--text-secondary); margin: 0; font-size: 14px; }
.flag { margin: 6px 0 0; font-size: 14px; }
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 1px 9px 1px 3px; border-radius: 999px; font-size: 12.5px; font-weight: 650; border: 1px solid var(--border); color: var(--text-primary); white-space: nowrap; }
.pill .ic { width: 16px; height: 16px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 11px; color: #fff; }
.pill.good .ic { background: var(--good); } .pill.warning .ic { background: var(--warning); color: #3a2a00; } .pill.critical .ic { background: var(--critical); } .pill.neutral .ic { background: var(--neutral); }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin: 14px 0; }
.kpis div { min-width: 0; }
.kpis dt { color: var(--text-muted); font-size: 12.5px; }
.kpis dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
figure { margin: 0; }
figcaption { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.chart { position: relative; }
.chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart text { fill: var(--text-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.tip { position: absolute; pointer-events: none; background: var(--surface-1); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.12); transform: translate(-50%, -110%); color: var(--text-primary); }
details { margin-top: 10px; }
summary { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
table { border-collapse: collapse; margin-top: 8px; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { text-align: right; padding: 3px 10px; border-bottom: 1px solid var(--border); }
th:first-child, td:first-child { text-align: left; }
footer { margin-top: 24px; color: var(--text-muted); font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>Extension scorecard</h1>
  <p class="sub">As of ${esc(sc.asOf)} · target $${rules.target}/month per extension</p>
  ${sample ? '<p class="banner"><strong>Sample data.</strong> These numbers are made up to show how each rule looks. Run <code>pnpm scorecard</code> for your real numbers.</p>' : ''}
  ${p.winnerRule ? `<p class="banner">🏆 ${esc(p.winnerRule.text)}</p>` : ''}
  <section class="tiles">
    <div class="tile"><div class="label">Portfolio revenue, last 30 days</div><div class="value">${money(p.total)}</div>
      <div class="meter" role="img" aria-label="${Math.round(share)}% of the ${money(p.goal)} goal"><span style="width:${share.toFixed(1)}%"></span></div>
      <div class="label">${Math.round(share)}% of ${money(p.goal)} goal ($${rules.target} × ${p.live} live)</div></div>
    <div class="tile"><div class="label">Live extensions</div><div class="value">${p.live}</div><div class="label">${sc.items.length - p.live} not launched yet</div></div>
    <div class="tile"><div class="label">At the $${rules.target} target</div><div class="value">${p.atTarget}</div><div class="label">of ${p.live} live</div></div>
  </section>
  <section class="cards">${sc.items.map((i) => card(i, rules)).join('')}</section>
  <footer>Rules: specs/12-SCORECARD.md · thresholds: tools/scorecard/rules.json</footer>
</main>
<script>
const DATA = ${json};
const fmt = (v, m) => v == null ? '—' : (m ? '$' + Math.round(v).toLocaleString('en-US') : v.toLocaleString('en-US'));
function nice(max) { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))); for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= max) return s * p; return 10 * p; }
function draw(el) {
  const pts = DATA[el.dataset.slug].map((h) => ({ week: h.week, v: h[el.dataset.key] }));
  const isMoney = !!el.dataset.money, target = el.dataset.target ? Number(el.dataset.target) : null;
  const W = 300, H = 130, L = 34, R = 10, T = 10, B = 20;
  const vals = pts.map((p) => p.v).filter((v) => v != null);
  const top = nice(Math.max(1, ...vals, target ?? 0));
  const x = (i) => L + (pts.length < 2 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', el.closest('figure').querySelector('figcaption').textContent + ': latest ' + fmt(vals[vals.length - 1], isMoney));
  const add = (tag, a) => { const n = document.createElementNS(ns, tag); for (const k in a) n.setAttribute(k, a[k]); svg.appendChild(n); return n; };
  for (const g of [0, 0.5, 1]) {
    add('line', { x1: L, x2: W - R, y1: y(top * g), y2: y(top * g), stroke: 'var(--grid)', 'stroke-width': 1 });
    add('text', { x: L - 6, y: y(top * g) + 3, 'text-anchor': 'end' }).textContent = fmt(top * g, isMoney);
  }
  if (target != null) add('line', { x1: L, x2: W - R, y1: y(target), y2: y(target), stroke: 'var(--target)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' });
  add('text', { x: L, y: H - 4 }).textContent = pts[0] ? pts[0].week.slice(5) : '';
  if (pts.length > 1) add('text', { x: W - R, y: H - 4, 'text-anchor': 'end' }).textContent = pts[pts.length - 1].week.slice(5);
  let d = '', pen = false;
  pts.forEach((p, i) => { if (p.v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); pen = true; });
  add('path', { d, fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const lastI = pts.map((p) => p.v != null).lastIndexOf(true);
  if (lastI >= 0) add('circle', { cx: x(lastI), cy: y(pts[lastI].v), r: 4, fill: 'var(--series-1)', stroke: 'var(--surface-1)', 'stroke-width': 2 });
  const cross = add('line', { y1: T, y2: H - B, stroke: 'var(--text-muted)', 'stroke-width': 1, visibility: 'hidden' });
  const dot = add('circle', { r: 4, fill: 'var(--series-1)', stroke: 'var(--surface-1)', 'stroke-width': 2, visibility: 'hidden' });
  const hit = add('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent' });
  el.appendChild(svg);
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; el.appendChild(tip);
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    let best = 0; pts.forEach((_, i) => { if (Math.abs(x(i) - sx) < Math.abs(x(best) - sx)) best = i; });
    const p = pts[best];
    cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best)); cross.setAttribute('visibility', 'visible');
    if (p.v != null) { dot.setAttribute('cx', x(best)); dot.setAttribute('cy', y(p.v)); dot.setAttribute('visibility', 'visible'); } else dot.setAttribute('visibility', 'hidden');
    tip.hidden = false;
    tip.textContent = 'Week of ' + p.week + ': ' + fmt(p.v, isMoney);
    tip.style.left = (x(best) / W) * r.width + 'px';
    tip.style.top = ((p.v != null ? y(p.v) : T) / H) * r.height + 'px';
  };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
}
document.querySelectorAll('.chart').forEach(draw);
</script>
</body>
</html>
`;
}
