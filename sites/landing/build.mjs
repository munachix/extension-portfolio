#!/usr/bin/env node
/**
 * Builds the website into sites/landing/public/ (plain static files).
 *   node sites/landing/build.mjs
 * Content: src/products.mjs. Look: src/style.css. Brand, email, domain: site.config.json.
 * Prices and Chrome Web Store ids are read from each extensions/<slug>/extension.config.json.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from './src/products.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'public');
const SITE = JSON.parse(await readFile(path.join(HERE, 'site.config.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => s.replace(/<[^>]+>/g, '');

for (const p of PRODUCTS) {
  const cfg = JSON.parse(await readFile(path.join(ROOT, 'extensions', p.slug, 'extension.config.json'), 'utf8'));
  p.price = cfg.priceText.replace(/lifetime/g, 'once');
  p.subscription = /\/(mo|month|year|yr)/.test(p.price);
  p.oneTime = /once/.test(p.price);
  p.store = cfg.storeExtensionId && !/REPLACE/.test(cfg.storeExtensionId) ? `https://chromewebstore.google.com/detail/${cfg.storeExtensionId}` : null;
}

// ---------- shared pieces ----------
const CHROME = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8.4h9M8.9 13.8 4.4 6M15.1 13.8 10.6 21.6" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

const installBtn = (p, label = 'Add to Chrome — it’s free') => p.store
  ? `<a class="btn" href="${p.store}" rel="noopener">${CHROME}${label}</a>`
  : `<span class="btn soon" title="Being reviewed by the Chrome Web Store">${CHROME}Coming soon to Chrome</span>`;

function layout({ title, description, body, depth = 0, product = null, canonical = '' }) {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://${SITE.domain}/${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#f3f0e8">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}style.css">
</head>
<body${product ? ` data-p="${product.slug}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
  <a class="mark" href="${up || './'}" aria-label="${esc(SITE.brand)} home"><i></i>${esc(SITE.brand)}</a>
  <nav class="nav" aria-label="Main">
    <a href="${up}#tools">Tools</a>
    <a class="hide-sm" href="${up}#principles">How we work</a>
    <a href="${up}support.html">Support</a>
  </nav>
</div></header>
<main id="main">
${body}
</main>
${footer(up)}
<script>
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'}):null;
document.querySelectorAll('.rv').forEach(el=>io?io.observe(el):el.classList.add('in'));
</script>
</body>
</html>
`;
}

function footer(up) {
  const groups = [['For job seekers', ['hirefill', 'visaflag', 'workfromwhere']], ['For sellers & studios', ['flipcomps', 'reconfinder', 'borderbatch']]];
  const name = (s) => PRODUCTS.find((p) => p.slug === s).name;
  return `<footer class="foot"><div class="wrap">
  <div class="cols">
    <div><a class="mark" href="${up || './'}"><i></i>${esc(SITE.brand)}</a><p class="blurb">Small, private Chrome extensions. Free where it counts, one fair price for the rest.</p></div>
    ${groups.map(([h, slugs]) => `<div><h5>${h}</h5><ul>${slugs.map((s) => `<li><a href="${up}${s}/">${name(s)}</a></li>`).join('')}</ul></div>`).join('')}
    <div><h5>Company</h5><ul><li><a href="${up}support.html">Support</a></li><li><a href="${up}privacy.html">Privacy</a></li><li><a href="${up}terms.html">Terms</a></li><li><a href="${up}refunds.html">Refunds</a></li></ul></div>
  </div>
  <div class="fine"><span>© ${new Date().getFullYear()} ${esc(SITE.operator)}. Payments by Creem, our merchant of record.</span><span>Not affiliated with Google, LinkedIn, Intuit, eBay, Meta or any job site.</span></div>
</div></footer>`;
}

const win = (url, inner, cls = '') => `<div class="win ${cls}"><div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="url">${esc(url)}</span></div><div class="body">${inner}</div></div>`;

// ---------- home ----------
function home() {
  const row = (p, i) => `<li data-i="${p.slug}"><a href="${p.slug}/">
    <span class="n">${String(i + 1).padStart(2, '0')}</span>
    <img src="${p.slug}/icon.png" alt="" width="48" height="48" loading="lazy">
    <span><span class="name">${p.name}</span><span class="for">${p.audience}</span></span>
    <span class="what">${esc(p.line)}</span>
    <span class="price"><b>${esc(p.priceLine)}</b>Pro ${esc(p.price)}</span>
    <span class="go">${ARROW}</span></a></li>`;
  const ex = (slug) => { const p = PRODUCTS.find((x) => x.slug === slug); return `<a href="${slug}/" style="text-decoration:none" data-p="${slug}">${win(p.url, p.mock())}</a>`; };
  const body = `
<div class="wrap">
  <div class="hero">
    <p class="eyebrow rv">Chrome extensions · Made to be trusted</p>
    <h1 class="rv">Small tools that do <em>one job</em> properly.</h1>
    <p class="lede rv">Six browser extensions for job seekers, resellers, bookkeepers and photographers. They work on the sites you already use, keep your data on your computer, and never click a button for you.</p>
    <div class="ctas rv"><a class="btn" href="#tools">See the tools ${ARROW}</a><a class="btn ghost" href="#principles">How we work</a></div>
    <div class="facts rv">
      <div><b>6</b><span>focused extensions</span></div>
      <div><b>0</b><span>accounts to create</span></div>
      <div><b>Free</b><span>core job, no time limit</span></div>
      <div><b>14 days</b><span>refund on anything paid</span></div>
    </div>
  </div>
</div>

<section id="tools" class="rule-top"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">The tools</span><h2>Each one answers a single, annoying question.</h2></div>
  <ol class="index">${PRODUCTS.map(row).join('')}</ol>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">In the page</span><h2>They show up exactly where you need them.</h2></div>
  <div class="strip rv">${ex('visaflag')}${ex('workfromwhere')}${ex('reconfinder')}</div>
</div></section>

<section id="principles" class="rule-top"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">How we work</span><h2>Three rules every tool follows.</h2></div>
  <div class="principles">
    <article class="rv"><span class="num">01</span><h3>The free version does the job.</h3><p>If someone else gives a feature away, so do we, with no limit. Pro is for the extras that save serious time, never for the basics.</p></article>
    <article class="rv"><span class="num">02</span><h3>Your data stays with you.</h3><p>CVs, client books, photos and browsing are processed in your browser. No accounts, no analytics, nothing sold. The only thing we ever see is a license key.</p></article>
    <article class="rv"><span class="num">03</span><h3>It never acts for you.</h3><p>Our tools read and suggest. They don’t submit applications, list items, tick reconciliations or post anything. You stay in control of every account.</p></article>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="ethos rv">
    <div><p class="eyebrow" style="color:inherit;opacity:.6;margin:0 0 18px">Pricing</p><h2>Pay once, where we can.</h2><p>Most of our tools are a single payment you’ll never hear about again. The two that need ongoing work offer a lifetime or yearly option too. Every purchase has a 14-day refund, no questions asked.</p></div>
    <table><thead><tr><th>Tool</th><th>Free</th><th>Pro</th></tr></thead><tbody>
      ${PRODUCTS.map((p) => `<tr><td>${p.name}</td><td>${esc(p.priceLine)}</td><td>${esc(p.price)}</td></tr>`).join('')}
    </tbody></table>
  </div>
</div></section>`;
  return layout({ title: `${SITE.brand} — ${SITE.tagline}`, description: 'Six small, private Chrome extensions: HireFill, VisaFlag, WorkFromWhere, FlipComps, ReconFinder and BorderBatch. Free core features, fair one-time prices.', body });
}

// ---------- product page ----------
function productPage(p) {
  const [, amt = p.price, rest = ''] = p.price.match(/^(\$[\d.]+)(.*)$/) ?? [];
  const body = `
<div class="wrap">
  <div class="p-hero">
    <div>
      <div class="crumbs mono"><a href="../">${esc(SITE.brand)}</a><span>/</span><span>${p.name}</span></div>
      <div class="p-id"><img src="icon.png" alt="" width="52" height="52"><div><span class="nm">${p.name}</span><span class="for">For ${p.audience.toLowerCase()}</span></div></div>
      <h1>${p.h1}</h1>
      <p class="lede">${esc(p.lede)}</p>
      <div class="ctas">${installBtn(p)}<a class="btn ghost" href="#pricing">Free vs Pro</a></div>
      <dl class="spec">${p.spec.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    </div>
    <div class="stage">${win(p.url, p.mock())}</div>
  </div>
</div>

<section class="rule-top"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">How it works</span><h2>Three steps, then it just runs.</h2></div>
  <ol class="steps">${p.steps.map(([h, t]) => `<li class="rv"><h3>${esc(h)}</h3><p>${esc(t)}</p></li>`).join('')}</ol>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">The details</span><h2>Built for the way it really goes.</h2></div>
  <div class="detail-grid">${p.details.map(([h, t]) => `<div class="rv"><h4>${esc(h)}</h4><p>${esc(t)}</p></div>`).join('')}</div>
</div></section>

<section id="pricing" class="rule-top"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">Free vs Pro</span><h2>The free version does the job. Pro saves you hours.</h2></div>
  <div class="plans rv">
    <div class="plan"><span class="tier">Free</span><div class="amt">$0<small>forever</small></div><p class="sub">${esc(p.freeSub)}</p><ul>${p.free.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><div style="margin-top:24px">${installBtn(p, 'Add to Chrome')}</div></div>
    <div class="plan"><span class="tier">Pro</span><div class="amt">${esc(amt)}<small>${esc(rest.trim())}</small></div><p class="sub">${esc(p.proSub)}</p><ul>${p.pro.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p class="note">${esc(p.proNote)} Upgrade from inside the extension. Your key arrives by email; <a href="refunds.html">14-day refund</a>.</p></div>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">Questions</span><h2>Things people ask first.</h2></div>
  <div class="faq">${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">The small print</span><h2>Plain-English policies for ${p.name}.</h2></div>
  <div class="docs">
    <a href="privacy.html"><b>Privacy</b><span>What ${p.name} stores, what it reads, and the one thing it ever sends.</span></a>
    <a href="terms.html"><b>Terms</b><span>Licenses, what ${p.name} is and isn’t responsible for.</span></a>
    <a href="refunds.html"><b>Refunds</b><span>14 days, no questions asked.</span></a>
  </div>
</div></section>`;
  return layout({ title: `${p.name}: ${p.title}`, description: `${p.line} ${p.priceLine}.`, body, depth: 1, product: p, canonical: `${p.slug}/` });
}

// ---------- documents ----------
function docPage({ p = null, kind, title, summary, sections, depth }) {
  const base = p ? '' : '';
  const nav = p
    ? [['privacy.html', 'Privacy'], ['terms.html', 'Terms'], ['refunds.html', 'Refunds'], ['./', `Back to ${p.name}`]]
    : [['privacy.html', 'Privacy'], ['terms.html', 'Terms'], ['refunds.html', 'Refunds'], ['support.html', 'Support']];
  const body = `<div class="wrap"><div class="doc">
  <aside><span class="eyebrow">${p ? esc(p.name) : esc(SITE.brand)}</span>
    <nav aria-label="Policies">${nav.map(([h, t]) => `<a href="${base}${h}"${h === `${kind}.html` ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  </aside>
  <article>
    <h1>${esc(title)}</h1>
    <p class="meta mono">Last updated ${esc(SITE.updated)}</p>
    ${summary ? `<div class="summary"><p>${summary}</p></div>` : ''}
    ${sections.map(([h, html], i) => `<h2 id="s${i + 1}">${esc(h)}</h2>${html}`).join('\n')}
  </article>
</div></div>`;
  return layout({ title: `${title}${p ? ` · ${p.name}` : ''} · ${SITE.brand}`, description: strip(summary ?? title), body, depth, product: p, canonical: p ? `${p.slug}/${kind}.html` : `${kind}.html` });
}

const mail = `<a href="mailto:${SITE.supportEmail}">${SITE.supportEmail}</a>`;
const table = (rows, head = ['What', 'Why']) => `<table><thead><tr><th>${head[0]}</th><th>${head[1]}</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;
const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

function privacyPage(p) {
  const v = p.privacy;
  return docPage({ p, kind: 'privacy', depth: 1, title: 'Privacy policy', summary: esc(v.summary), sections: [
    ['What stays on your computer', `${list(v.stored)}<p>These are kept in your browser’s extension storage (<code>chrome.storage.local</code>). They are not synced to us.</p>`],
    ['What it reads', `<p>${esc(v.reads)}</p>`],
    ['What it sends, and to whom', `${table(v.sends, ['Where', 'What and when'])}<p>Nothing else leaves your computer. There is no analytics, advertising or tracking code in ${p.name}, and we never sell or share data.</p>`],
    ['Permissions, explained', table(v.permissions, ['Permission', 'Why it’s needed'])],
    ['Payments', `<p>Purchases are handled by Creem, our merchant of record. Creem receives your payment details and email under its own privacy policy; we receive your email and order so we can support you and honour refunds.</p>`],
    ['Deleting your data', `<p>${esc(v.delete)} To ask about anything we hold (your order email), write to ${mail}.</p>`],
    ['Chrome Web Store user data policy', `<p>${p.name}’s use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide the features described above.</p>`],
    ['Changes and contact', `<p>If this policy changes, we update the date above and describe the change in the extension’s release notes. Questions: ${mail}.</p>`],
  ] });
}

function termsPage(p) {
  return docPage({ p, kind: 'terms', depth: 1, title: 'Terms of use', summary: `${esc(p.name)} is free to use. Pro features need a license key. Please read the parts about what ${esc(p.name)} does and doesn’t do: they matter.`, sections: [
    ['The service', `<p>${esc(p.name)} is a Chrome extension made by ${esc(SITE.operator)}. ${esc(p.line)} Free features are free to use for as long as we offer the extension.</p>`],
    ...p.terms.map(([h, t]) => [h, `<p>${esc(t)}</p>`]),
    ['Pro licenses', `<p>Pro features are unlocked with a license key bought through Creem, our merchant of record, which handles payment, tax and invoices. ${p.oneTime ? 'A one-time (lifetime) license includes updates for as long as the extension is offered.' : ''} ${p.subscription ? 'Subscriptions renew until cancelled; cancel any time from your Creem receipt email or customer portal, and Pro stays active until the end of the period you paid for.' : ''} A license is for your own use, on your own browsers. Please don’t share or resell keys.</p>`],
    ['Websites change', `<p>${esc(p.name)} works with third-party websites that can change without notice. When that breaks something, we aim to fix it quickly, but we can’t promise every feature will work at all times.</p>`],
    ['No warranty, limited liability', `<p>${esc(p.name)} is provided “as is”. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing here limits rights you have under consumer law that can’t be limited.</p>`],
    ['Not affiliated', `<p>Names of websites and companies are used only to describe where ${esc(p.name)} works. We are not affiliated with or endorsed by them.</p>`],
    ['Changes and contact', `<p>We may update these terms; the date above shows when. Continuing to use ${esc(p.name)} after a change means you accept it.${SITE.governingLaw ? ` These terms are governed by the laws of ${esc(SITE.governingLaw)}.` : ''} Questions: ${mail}.</p>`],
  ] });
}

function refundsPage(p) {
  return docPage({ p, kind: 'refunds', depth: 1, title: 'Refund policy', summary: `14 days, no questions asked. If ${esc(p.name)} Pro isn’t right for you, you get all your money back.`, sections: [
    ['How to get a refund', `<p>Email ${mail} within 14 days of buying, from the address you used at checkout (or include your order number). We refund the full amount through Creem, usually within a couple of days; your bank may take 5–10 business days to show it.</p>`],
    ...(p.subscription ? [['Subscriptions', `<p>Cancel any time to stop future renewals; you keep Pro until the end of the period you paid for. If a renewal surprises you, ask within 14 days of it and we’ll refund that renewal.</p>`]] : []),
    ...(p.oneTime ? [['One-time purchases', `<p>The 14 days start on the day you buy. After that, purchases are final, except where the law gives you more rights, or if ${esc(p.name)} stops working for you and we can’t fix it, in which case write to us.</p>`]] : []),
    ['After a refund', `<p>Your license key is deactivated and ${esc(p.name)} returns to the free plan. Nothing you stored in the extension is deleted.</p>`],
  ] });
}

function siteDocs() {
  const all = PRODUCTS.map((p) => `<li><a href="${p.slug}/privacy.html">${p.name} privacy policy</a></li>`).join('');
  return {
    'privacy.html': docPage({ kind: 'privacy', depth: 0, title: 'Privacy', summary: `Our extensions process your data in your browser. Each one has its own short privacy policy that lists exactly what it stores, reads and sends.`, sections: [
      ['Each product’s policy', `<ul>${all}</ul>`],
      ['This website', `<p>This website uses no cookies, analytics or tracking. Fonts are loaded from Google Fonts, which receives your IP address as part of the request.</p>`],
      ['Purchases and support', `<p>Creem, our merchant of record, processes payments under its own privacy policy and shares your email and order with us. When you email ${mail}, we keep the conversation to help you. We never sell or share your data.</p>`],
    ] }),
    'terms.html': docPage({ kind: 'terms', depth: 0, title: 'Terms', summary: 'Each extension has its own terms, because what each one does (and doesn’t do) is different.', sections: [
      ['Each product’s terms', `<ul>${PRODUCTS.map((p) => `<li><a href="${p.slug}/terms.html">${p.name} terms of use</a></li>`).join('')}</ul>`],
      ['Who we are', `<p>The extensions are made by ${esc(SITE.operator)}. Payments, tax and invoices are handled by Creem, our merchant of record.</p>`],
    ] }),
    'refunds.html': docPage({ kind: 'refunds', depth: 0, title: 'Refunds', summary: 'Every paid plan has a 14-day refund, no questions asked.', sections: [
      ['How', `<p>Email ${mail} within 14 days of your purchase or renewal, from the address you used at checkout. We refund in full through Creem.</p>`],
      ['Per product', `<ul>${PRODUCTS.map((p) => `<li><a href="${p.slug}/refunds.html">${p.name}</a>: Pro ${esc(p.price)}</li>`).join('')}</ul>`],
    ] }),
  };
}

function support() {
  const body = `<div class="wrap"><div class="doc">
  <aside><span class="eyebrow">${esc(SITE.brand)}</span><nav aria-label="Policies"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="refunds.html">Refunds</a><a href="support.html" aria-current="page">Support</a></nav></aside>
  <article>
    <h1>Support</h1>
    <p class="meta mono">A real person replies, usually within one working day.</p>
    <div class="summary"><p>Email ${mail}. Tell us which extension, what you expected and what happened. If it’s about a website, the page address helps us fix it fast.</p></div>
    <h2>Lost your license key?</h2><p>It’s in the receipt email from Creem. Search your inbox for “Creem”. Still missing? Email us from the address you paid with and we’ll resend it.</p>
    <h2>Moving to a new computer</h2><p>Install the extension and paste the same key under Settings. Removing the key on the old browser frees it up.</p>
    <h2>Something stopped working</h2><p>Websites change their pages. Fields or badges that we can’t read are shown as “needs you” or “unclear” instead of guessing. Send us the page address and we’ll update the extension.</p>
    <h2>Refunds</h2><p>14 days, no questions asked. See the <a href="refunds.html">refund policy</a>.</p>
  </article></div></div>`;
  return layout({ title: `Support · ${SITE.brand}`, description: `Get help with ${PRODUCTS.map((p) => p.name).join(', ')}.`, body, canonical: 'support.html' });
}

function notFound() {
  return layout({ title: `Not found · ${SITE.brand}`, description: 'Page not found', body: `<div class="wrap"><div class="hero"><p class="eyebrow">404</p><h1>That page isn’t <em>here.</em></h1><p class="lede">It may have moved. The tools are all on the home page.</p><a class="btn" href="/">Go home ${ARROW}</a></div></div>` });
}

// ---------- write ----------
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const files = { 'index.html': home(), 'support.html': support(), '404.html': notFound(), ...siteDocs() };
for (const p of PRODUCTS) {
  files[`${p.slug}/index.html`] = productPage(p);
  files[`${p.slug}/privacy.html`] = privacyPage(p);
  files[`${p.slug}/terms.html`] = termsPage(p);
  files[`${p.slug}/refunds.html`] = refundsPage(p);
}
for (const [f, html] of Object.entries(files)) {
  await mkdir(path.dirname(path.join(OUT, f)), { recursive: true });
  await writeFile(path.join(OUT, f), html);
}
await copyFile(path.join(HERE, 'src/style.css'), path.join(OUT, 'style.css'));
for (const p of PRODUCTS) {
  const icon = path.join(ROOT, 'extensions', p.slug, 'public/icons/128.png');
  if (existsSync(icon)) await copyFile(icon, path.join(OUT, p.slug, 'icon.png'));
}
await writeFile(path.join(OUT, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="6" fill="#f3f0e8" stroke="#161513" stroke-width="2.4"/><rect x="17" y="8" width="7" height="7" rx="1.5" fill="#161513"/></svg>');
await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://${SITE.domain}/sitemap.xml\n`);
await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(files).filter((f) => f !== '404.html').map((f) => `  <url><loc>https://${SITE.domain}/${f.replace(/index\.html$/, '')}</loc></url>`).join('\n')}\n</urlset>\n`);

const todo = [];
if (/REPLACE-ME/.test(SITE.supportEmail)) todo.push('supportEmail in site.config.json');
if (/example/.test(SITE.domain)) todo.push('domain in site.config.json');
if (!SITE.governingLaw) todo.push('governingLaw in site.config.json (for the terms)');
const soon = PRODUCTS.filter((p) => !p.store).map((p) => p.name);
console.log(`✓ Built ${Object.keys(files).length} pages → ${path.relative(ROOT, OUT)}`);
if (soon.length) console.log(`  “Coming soon” buttons until a Chrome Web Store id is set: ${soon.join(', ')}`);
if (todo.length) console.log(`⚠ Before publishing, fill in: ${todo.join('; ')}`);
