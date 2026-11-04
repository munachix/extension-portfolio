/** HireFill app: side panel (and full tab via Options). Plain DOM, no framework. */
import { downloadText, isPro, toCsv } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import { AI_HOSTS, complete, localStatus } from '../ai/ai';
import { answerPrompt, coverLetterPrompt, profileText, tailorPrompt } from '../ai/prompts';
import { truthGuard } from '../ai/truth';
import { extractText } from '../profile/extract';
import { parseCvText } from '../profile/parse-cv';
import { DECLINE, type Profile, type Work } from '../profile/schema';
import { exportDocx, exportPdf } from '../resume/export';
import { keywordMatch } from '../resume/keywords';
import { cvFileName, db, DEFAULT_MODELS, fileToStored, FREE_FILLS, LICENSE, PRICE, PRO_FEATURES, PRODUCT, type AISettings, type Application } from '../store';

type Props = Record<string, unknown>;
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: (Node | string | null | false | undefined)[]) => {
  const n = Object.assign(document.createElement(tag), props) as HTMLElementTagNameMap[K];
  for (const k of kids) if (k != null && k !== false) n.append(k);
  return n;
};
const card = (title: string, ...kids: (Node | string | null | false | undefined)[]) => h('section', { className: 'x-card' }, h('h2', { textContent: title }), ...kids);
const muted = (t: string) => h('p', { className: 'x-muted', textContent: t });
const btn = (text: string, onClick: () => unknown, primary = false) => { const b = h('button', { type: 'button', textContent: text, className: primary ? 'primary' : '' }); b.addEventListener('click', () => void onClick()); return b; };
const field = (label: string, input: HTMLElement) => h('div', {}, h('label', { textContent: label }), input);

const TABS = ['Setup', 'Profile', 'Questions', 'Answers', 'Tailor', 'Tracker', 'Settings'] as const;
type Tab = (typeof TABS)[number];
const root = document.getElementById('app')!;
const nav = document.getElementById('tabs')!;
let tab: Tab = (new URLSearchParams(location.search).get('tab') as Tab) || 'Setup';

async function activeTab() { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); return t; }
async function askTab<T>(msg: unknown): Promise<T | null> {
  const t = await activeTab();
  if (!t?.id) return null;
  try { return await chrome.tabs.sendMessage(t.id, msg); } catch {
    try { await chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['content.js'] }); return await chrome.tabs.sendMessage(t.id, msg); } catch { return null; }
  }
}

function renderNav() {
  nav.replaceChildren(...TABS.map((t) => { const b = h('button', { type: 'button', textContent: t, className: t === tab ? 'primary' : '' }); b.addEventListener('click', () => { tab = t; void show(); }); return b; }));
}

async function show() {
  renderNav();
  root.replaceChildren(muted('Loading…'));
  const views: Record<Tab, () => Promise<HTMLElement[]>> = { Setup: setup, Profile: profileView, Questions: questions, Answers: answersView, Tailor: tailor, Tracker: tracker, Settings: settings };
  root.replaceChildren(...(await views[tab]()));
}

// ---------- Setup ----------
async function setup(): Promise<HTMLElement[]> {
  const p = await db.profile();
  const resume = await db.file('resume');
  const input = h('input', { type: 'file', accept: '.pdf,.docx,.txt' });
  const msg = h('div', { className: 'x-msg', role: 'status' });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    msg.className = 'x-msg';
    msg.textContent = 'Reading your CV on this computer…';
    try {
      const text = await extractText(f);
      const parsed = parseCvText(text);
      const keep = await db.profile();
      // keep answers the user already gave; take everything else from the new CV
      await db.saveProfile({ ...parsed, answers: keep.answers, preferredName: keep.preferredName, country: keep.country || parsed.country });
      await db.saveCvText(text);
      await db.saveFile('resume', await fileToStored(f));
      msg.className = 'x-msg ok';
      msg.textContent = `Done: found ${parsed.work.length} job(s), ${parsed.education.length} education entr${parsed.education.length === 1 ? 'y' : 'ies'}, ${parsed.skills.length} skills. Check your Profile next.`;
      setTimeout(() => { tab = 'Profile'; void show(); }, 1200);
    } catch (e) { msg.className = 'x-msg err'; msg.textContent = (e as Error).message; }
  });
  const used = await db.fills();
  const pro = await isPro();
  return [
    card('1. Upload your CV', muted('PDF or Word. It’s read on your computer and never uploaded.'), input, msg, resume ? muted(`Current CV: ${resume.name}`) : null),
    card('2. Check your profile', muted(p.email ? `${p.firstName} ${p.lastName} · ${p.email}` : 'Not set up yet.'), btn('Open Profile', () => { tab = 'Profile'; void show(); })),
    card('3. Answer the common questions once', muted('Work authorization, sponsorship, salary, notice period…'), btn('Open Questions', () => { tab = 'Questions'; void show(); })),
    card('4. Fill an application', muted('Open any job application (Workday, Greenhouse, Lever, iCIMS…). Click “⚡ Fill with HireFill” on the page, or the button below.'), btn('Fill the current tab', async () => { await askTab({ type: 'hf:fill' }); }, true),
      muted(pro ? 'HireFill Pro: unlimited fills.' : `Free fills used: ${used} of ${FREE_FILLS}.`)),
  ];
}

// ---------- Profile ----------
async function profileView(): Promise<HTMLElement[]> {
  const p = await db.profile();
  const inputs: [keyof Profile, string][] = [['firstName', 'First name'], ['lastName', 'Last name'], ['preferredName', 'Preferred name'], ['email', 'Email'], ['phone', 'Phone'], ['phoneCountryCode', 'Phone country code (e.g. 1)'], ['address1', 'Street address'], ['city', 'City'], ['state', 'State / province'], ['postalCode', 'ZIP / postal code'], ['country', 'Country'], ['linkedin', 'LinkedIn URL'], ['github', 'GitHub URL'], ['website', 'Website / portfolio'], ['headline', 'Current title']];
  const contact = card('Contact', ...inputs.map(([k, l]) => { const i = h('input', { type: 'text', value: String(p[k] ?? '') }); i.addEventListener('input', () => { (p as unknown as Record<string, string>)[k] = i.value; }); return field(l, i); }));
  const summary = h('textarea', { value: p.summary });
  summary.addEventListener('input', () => { p.summary = summary.value; });
  const skills = h('textarea', { value: p.skills.join(', ') });
  skills.addEventListener('input', () => { p.skills = skills.value.split(',').map((s) => s.trim()).filter(Boolean); });

  const workBox = h('div');
  const renderWork = () => {
    workBox.replaceChildren(...p.work.map((w, i) => {
      const box = h('div', { className: 'x-card' });
      for (const [k, l] of [['title', 'Job title'], ['company', 'Company'], ['location', 'Location'], ['start', 'Start (YYYY-MM)'], ['end', 'End (YYYY-MM)']] as [keyof Work, string][]) {
        const inp = h('input', { type: 'text', value: String(w[k] ?? '') });
        inp.addEventListener('input', () => { (w as unknown as Record<string, string>)[k] = inp.value; });
        box.append(field(l, inp));
      }
      const cur = h('input', { type: 'checkbox', checked: w.current });
      cur.addEventListener('change', () => { w.current = cur.checked; });
      const d = h('textarea', { value: w.description });
      d.addEventListener('input', () => { w.description = d.value; });
      box.append(h('label', { className: 'x-check' }, cur, 'I currently work here'), field('What you did (one bullet per line)', d), btn('Remove', () => { p.work.splice(i, 1); renderWork(); }));
      return box;
    }), btn('+ Add job', () => { p.work.push({ title: '', company: '', location: '', start: '', end: '', current: false, description: '' }); renderWork(); }));
  };
  renderWork();
  const eduBox = h('div');
  const renderEdu = () => {
    eduBox.replaceChildren(...p.education.map((e, i) => {
      const box = h('div', { className: 'x-card' });
      for (const [k, l] of [['school', 'School'], ['degree', 'Degree'], ['field', 'Field of study'], ['start', 'Start'], ['end', 'End'], ['gpa', 'GPA (optional)']] as const) {
        const inp = h('input', { type: 'text', value: e[k] });
        inp.addEventListener('input', () => { e[k] = inp.value; });
        box.append(field(l, inp));
      }
      box.append(btn('Remove', () => { p.education.splice(i, 1); renderEdu(); }));
      return box;
    }), btn('+ Add education', () => { p.education.push({ school: '', degree: '', field: '', start: '', end: '', gpa: '' }); renderEdu(); }));
  };
  renderEdu();
  const msg = h('div', { className: 'x-msg', role: 'status' });
  const save = btn('Save profile', async () => { await db.saveProfile(p); msg.className = 'x-msg ok'; msg.textContent = 'Saved.'; }, true);
  return [contact, card('Summary', summary), card('Work history', workBox), card('Education', eduBox), card('Skills (comma-separated)', skills), h('div', { className: 'sticky' }, save, msg)];
}

// ---------- Questions ----------
async function questions(): Promise<HTMLElement[]> {
  const p = await db.profile();
  const a = p.answers;
  const yn = (k: 'authorizedToWork' | 'needSponsorship' | 'willingToRelocate', label: string) => {
    const s = h('select', {}, h('option', { value: '', textContent: '—' }), h('option', { value: 'yes', textContent: 'Yes' }), h('option', { value: 'no', textContent: 'No' }));
    s.value = a[k];
    s.addEventListener('change', () => { a[k] = s.value as 'yes' | 'no' | ''; });
    return field(label, s);
  };
  const txt = (k: 'noticePeriod' | 'salaryExpectation' | 'yearsExperience' | 'howDidYouHear', label: string, ph = '') => { const i = h('input', { type: 'text', value: a[k], placeholder: ph }); i.addEventListener('input', () => { a[k] = i.value; }); return field(label, i); };
  const demo = (k: 'gender' | 'ethnicity' | 'veteran' | 'disability', label: string) => { const i = h('input', { type: 'text', value: a[k], placeholder: DECLINE }); i.addEventListener('input', () => { a[k] = i.value || DECLINE; }); return field(label, i); };
  const msg = h('div', { className: 'x-msg', role: 'status' });
  return [
    card('Work authorization', yn('authorizedToWork', 'Are you legally authorized to work in the country of the job?'), yn('needSponsorship', 'Will you need visa sponsorship?'), yn('willingToRelocate', 'Willing to relocate?')),
    card('Job details', txt('noticePeriod', 'Notice period / earliest start', 'e.g. 2 weeks'), txt('salaryExpectation', 'Salary expectation', 'e.g. 120000'), txt('yearsExperience', 'Years of experience (blank = from your work history)'), txt('howDidYouHear', 'How did you hear about us?', 'Company website')),
    card('Voluntary self-identification (optional)', muted(`Defaults to “${DECLINE}”. Change only if you want to.`), demo('gender', 'Gender'), demo('ethnicity', 'Race / ethnicity'), demo('veteran', 'Veteran status'), demo('disability', 'Disability')),
    h('div', {}, btn('Save answers', async () => { await db.saveProfile(p); msg.className = 'x-msg ok'; msg.textContent = 'Saved.'; }, true), msg),
  ];
}

// ---------- Answer Bank ----------
async function answersView(): Promise<HTMLElement[]> {
  const bank = await db.answers();
  const list = bank.map((a, i) => {
    const t = h('textarea', { value: a.answer });
    t.addEventListener('change', async () => { bank[i].answer = t.value; await db.saveAnswers(bank); });
    return h('div', { className: 'x-card' }, h('strong', { textContent: a.question }), t, btn('Delete', async () => { bank.splice(i, 1); await db.saveAnswers(bank); void show(); }));
  });
  return [card('Answer Bank', muted('When you type an answer HireFill doesn’t know, it offers to save it. Similar questions get it filled automatically (marked yellow so you check it).')), ...(list.length ? list : [muted('No saved answers yet.')])];
}

// ---------- Tailor ----------
async function tailor(): Promise<HTMLElement[]> {
  const pro = await isPro();
  const settings = await db.settings();
  const p = await db.profile();
  const out: HTMLElement[] = [];
  const jobBox = h('textarea', { placeholder: 'Open the job post in this tab and click “Load job post”, or paste the description here.' });
  const company = h('input', { type: 'text', placeholder: 'Company' });
  const role = h('input', { type: 'text', placeholder: 'Role' });
  const score = h('div');
  const load = btn('Load job post from this tab', async () => {
    const j = await askTab<{ company: string; role: string; description: string }>({ type: 'hf:job' });
    if (!j) { score.textContent = 'Couldn’t read this tab. Paste the description instead.'; return; }
    jobBox.value = j.description; company.value = j.company; role.value = j.role;
    check();
  });
  const check = async () => {
    const r = keywordMatch(jobBox.value, `${profileText(p)}\n${await db.cvText()}`, p.skills);
    score.replaceChildren(h('p', {}, h('strong', { textContent: `Match: ${r.score}%` }), ` · ${r.found.length} keywords found`), r.missing.length ? h('p', { className: 'x-muted', textContent: `Missing (most repeated first): ${r.missing.slice(0, 12).map((m) => m.term).join(', ')}` }) : muted('No important keywords missing.'), muted('Only add a missing keyword if it’s true for you.'));
  };
  jobBox.addEventListener('change', () => void check());
  out.push(card('Job post', load, field('Company', company), field('Role', role), jobBox, btn('Check match', check), score));

  const aiMsg = h('div', { className: 'x-msg', role: 'status' });
  const status = settings.ai.mode === 'local' ? await localStatus() : settings.ai.mode;
  const aiNote = settings.ai.mode === 'off' ? 'AI is off. Turn it on in Settings.' : settings.ai.mode === 'local' ? (status === 'unavailable' ? 'This computer can’t run Chrome’s built-in AI. Add your own API key in Settings.' : 'Using Chrome’s built-in AI (on your computer, free).') : `Using your ${settings.ai.provider} key.`;
  const tailored: Profile = structuredClone(p);
  const suggestions = h('div');
  const run = async () => {
    if (!pro) { aiMsg.className = 'x-msg err'; aiMsg.textContent = 'CV tailoring is part of HireFill Pro.'; return; }
    if (!jobBox.value.trim()) { aiMsg.className = 'x-msg err'; aiMsg.textContent = 'Load or paste the job post first.'; return; }
    aiMsg.className = 'x-msg'; aiMsg.textContent = 'Rewriting your bullets…';
    suggestions.replaceChildren();
    const known = `${profileText(p)}\n${await db.cvText()}`;
    for (let i = 0; i < Math.min(p.work.length, 4); i++) {
      try {
        const text = await complete(settings.ai, tailorPrompt(p, jobBox.value, i), (pct) => { aiMsg.textContent = `Downloading Chrome’s AI model… ${pct}%`; });
        const g = truthGuard(text, known, jobBox.value.match(/\b[A-Z][a-zA-Z+.#]+\b/g)?.join(' ') ?? '');
        const accept = h('input', { type: 'checkbox', checked: g.ok });
        const set = () => { tailored.work[i].description = accept.checked ? text.trim() : p.work[i].description; };
        accept.addEventListener('change', set);
        set();
        suggestions.append(h('div', { className: 'x-card' }, h('strong', { textContent: `${p.work[i].title}, ${p.work[i].company}` }),
          h('div', { className: 'cmp' }, h('div', {}, h('div', { className: 'x-muted', textContent: 'Before' }), h('pre', { textContent: p.work[i].description })), h('div', {}, h('div', { className: 'x-muted', textContent: 'After' }), h('pre', {}, ...g.sentences.map((s) => h('span', { className: s.unknown.length ? 'warn' : '', title: s.unknown.length ? `Not in your profile: ${s.unknown.join(', ')}` : '', textContent: `${s.text}\n` }))))),
          g.ok ? null : h('p', { className: 'x-msg err', textContent: `Truth guard: these aren’t in your profile: ${[...new Set(g.sentences.flatMap((s) => s.unknown))].join(', ')}. Left unticked — edit or reject.` }),
          h('label', { className: 'x-check' }, accept, 'Use this version')));
      } catch (e) { aiMsg.className = 'x-msg err'; aiMsg.textContent = (e as Error).message; return; }
    }
    aiMsg.className = 'x-msg ok'; aiMsg.textContent = 'Review each change, then export.';
  };
  const exportBox = h('div', { className: 'x-row' });
  const save = async (kind: 'pdf' | 'docx', attach: boolean) => {
    const blob = kind === 'pdf' ? await exportPdf(tailored) : await exportDocx(tailored);
    const name = cvFileName(tailored, company.value, role.value, kind);
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    if (attach) { await db.saveFile('tailored', await fileToStored(new File([blob], name, { type: blob.type }))); aiMsg.className = 'x-msg ok'; aiMsg.textContent = `${name} will be attached to your next applications (until you clear it in Settings).`; }
  };
  exportBox.append(btn('Download PDF', () => save('pdf', false)), btn('Download Word', () => save('docx', false)), btn('Use for applications', () => save('pdf', true), true));
  out.push(card('Tailor my CV to this job', muted(aiNote), muted('Rewrites and reorders only what you actually did. Anything new (employers, numbers, dates) is flagged and left out.'), btn('Suggest changes', run, true), aiMsg, suggestions, exportBox));

  const tone = h('select', {}, ...['formal', 'warm', 'short'].map((t) => h('option', { value: t, textContent: t })));
  const letter = h('textarea', { style: 'min-height:220px' });
  const q = h('input', { type: 'text', placeholder: 'Paste an application question, e.g. “Why do you want to work here?”' });
  const ans = h('textarea');
  const writeMsg = h('div', { className: 'x-msg', role: 'status' });
  const gen = async (prompt: string, target: HTMLTextAreaElement) => {
    if (!pro) { writeMsg.className = 'x-msg err'; writeMsg.textContent = 'Writing help is part of HireFill Pro.'; return; }
    writeMsg.className = 'x-msg'; writeMsg.textContent = 'Writing…';
    try {
      const text = await complete(settings.ai, prompt);
      target.value = text.trim();
      const g = truthGuard(text, `${profileText(p)}\n${await db.cvText()}`, jobBox.value);
      writeMsg.className = g.ok ? 'x-msg ok' : 'x-msg err';
      writeMsg.textContent = g.ok ? 'Draft ready. Edit it before using.' : `Check these — not in your profile: ${[...new Set(g.sentences.flatMap((s) => s.unknown))].slice(0, 8).join(', ')}`;
    } catch (e) { writeMsg.className = 'x-msg err'; writeMsg.textContent = (e as Error).message; }
  };
  out.push(card('Cover letter & answers', field('Tone', tone), btn('Write cover letter', () => gen(coverLetterPrompt(p, jobBox.value, tone.value as 'formal'), letter)), letter,
    h('div', { className: 'x-row' }, btn('Copy', () => navigator.clipboard.writeText(letter.value)), btn('Insert into the focused field', () => askTab({ type: 'hf:insert', text: letter.value }))),
    field('Help me answer', q), btn('Draft answer', () => gen(answerPrompt(p, jobBox.value, q.value), ans)), ans,
    h('div', { className: 'x-row' }, btn('Copy', () => navigator.clipboard.writeText(ans.value)), btn('Insert into the focused field', () => askTab({ type: 'hf:insert', text: ans.value }))), writeMsg));
  return out;
}

// ---------- Tracker ----------
async function tracker(): Promise<HTMLElement[]> {
  const apps = await db.apps();
  const due = apps.filter((a) => a.status === 'Applied' && a.followUp && Date.parse(a.followUp) < Date.now());
  const rows = apps.map((a, i) => {
    const s = h('select', {}, ...(['Applied', 'Interview', 'Offer', 'Rejected'] as Application['status'][]).map((x) => h('option', { value: x, textContent: x, selected: x === a.status })));
    s.addEventListener('change', async () => { apps[i].status = s.value as Application['status']; await db.saveApps(apps); });
    return h('tr', {}, h('td', {}, h('a', { href: a.url, target: '_blank', textContent: a.company || a.url })), h('td', { textContent: a.role }), h('td', { textContent: new Date(a.date).toLocaleDateString() }), h('td', { textContent: a.portal }), h('td', {}, s));
  });
  return [
    due.length ? card('Follow up', ...due.map((a) => muted(`${a.company}: applied ${new Date(a.date).toLocaleDateString()}, no update yet.`))) : h('span'),
    card(`Applications (${apps.length})`, apps.length ? h('table', { className: 'tbl' }, h('thead', {}, h('tr', {}, ...['Company', 'Role', 'Date', 'Portal', 'Status'].map((t) => h('th', { textContent: t })))), h('tbody', {}, ...rows)) : muted('Every application you fill is logged here automatically.'),
      apps.length ? btn('Export to CSV', () => downloadText('hirefill-applications.csv', toCsv(apps as unknown as Record<string, unknown>[], ['company', 'role', 'url', 'portal', 'date', 'status', 'cv']))) : null),
  ];
}

// ---------- Settings ----------
async function settings(): Promise<HTMLElement[]> {
  const s = await db.settings();
  const mode = h('select', {}, h('option', { value: 'local', textContent: 'Chrome built-in AI (free, on this computer)' }), h('option', { value: 'byok', textContent: 'My own API key' }), h('option', { value: 'off', textContent: 'Off (autofill only)' }));
  mode.value = s.ai.mode;
  const provider = h('select', {}, h('option', { value: 'openai', textContent: 'OpenAI' }), h('option', { value: 'anthropic', textContent: 'Anthropic (Claude)' }), h('option', { value: 'gemini', textContent: 'Google Gemini' }));
  provider.value = s.ai.provider;
  const key = h('input', { type: 'password', value: s.ai.apiKey, placeholder: 'API key', autocomplete: 'off' });
  const model = h('input', { type: 'text', value: s.ai.model, placeholder: DEFAULT_MODELS[s.ai.provider] });
  const msg = h('div', { className: 'x-msg', role: 'status' });
  const saveAi = async () => {
    const ai: AISettings = { mode: mode.value as AISettings['mode'], provider: provider.value as AISettings['provider'], apiKey: key.value.trim(), model: model.value.trim() };
    if (ai.mode === 'byok') {
      const ok = await chrome.permissions.request({ origins: [AI_HOSTS[ai.provider]] });
      if (!ok) { msg.className = 'x-msg err'; msg.textContent = 'HireFill needs permission to contact that AI provider.'; return; }
    }
    await db.saveSettings({ ai });
    msg.className = 'x-msg ok'; msg.textContent = 'Saved.';
  };
  const auto = h('input', { type: 'checkbox', checked: s.autoNextPage });
  auto.addEventListener('change', () => db.saveSettings({ autoNextPage: auto.checked }));
  const show = h('input', { type: 'checkbox', checked: s.showButton });
  show.addEventListener('change', () => db.saveSettings({ showButton: show.checked }));
  const pay = h('section');
  await renderPaywall(pay, { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES });
  const tailoredFile = await db.file('tailored');
  return [
    pay,
    card('Filling', h('label', { className: 'x-check' }, auto, 'Fill the next page automatically after I click Next (Workday, iCIMS…)'), h('label', { className: 'x-check' }, show, 'Show the “Fill with HireFill” button on application pages'),
      tailoredFile ? h('div', {}, muted(`Attaching tailored CV: ${tailoredFile.name}`), btn('Go back to my main CV', async () => { await db.saveFile('tailored', null); void showTab('Settings'); })) : null),
    card('AI', field('AI mode', mode), field('Provider (own key)', provider), field('API key', key), field('Model', model), muted('Your key stays on this computer and is only sent to the provider you pick.'), btn('Save AI settings', saveAi, true), msg),
    card('Your data', muted('Everything is stored in this browser only. No account, no servers.'),
      h('div', { className: 'x-row' }, btn('Export backup', async () => downloadText('hirefill-backup.json', JSON.stringify(await chrome.storage.local.get(null)), 'application/json')),
        btn('Delete all my data', async () => { if (confirm('Delete your profile, CVs, answers and tracker from this browser?')) { const lic = await chrome.storage.local.get('license'); await chrome.storage.local.clear(); await chrome.storage.local.set(lic); void showTab('Setup'); } }))),
  ];
}
async function showTab(t: Tab) { tab = t; await show(); }

void show();
chrome.storage.onChanged.addListener((c) => { if (c.applications && tab === 'Tracker') void show(); });
