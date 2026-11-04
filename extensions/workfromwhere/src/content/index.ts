/**
 * Content script. Reads the job page the user is viewing, runs the engine,
 * shows the badge, highlights the deciding sentence. Never clicks or submits
 * anything; makes no network requests.
 */
import { isPro, recordSuccess } from '@ext/core';
import { adapterFor, generic, watchPage } from '@ext/job-sites';
import { detect, type Verdict } from '../engine/detect';
import { loadSettings, onStorageChanged, savedJobs, type Settings } from '../settings';
import { badgeAttached, removeBadge, renderBadge } from './badge';
import { buildTextMap, clearHighlights, focusRange, highlightEvidence, rangeFor, type TextMap } from './highlight';
import { applyListBadges, clearListBadges } from './list';

declare global { interface Window { __wfwLoaded?: boolean } }

interface State { settings: Settings; pro: boolean; verdict: Verdict | null; map: TextMap | null; key: string; saved: boolean }

async function main() {
  const adapter = adapterFor(new URL(location.href)) ?? generic;
  const st: State = { settings: await loadSettings(), pro: await isPro(), verdict: null, map: null, key: '', saved: false };

  const run = async (force = false) => {
    const job = adapter.readJob(document);
    if (!job) {
      if (badgeAttached()) { removeBadge(); clearHighlights(); }
      st.verdict = null;
    } else {
      const map = job.descriptionEl ? buildTextMap(job.descriptionEl) : { text: '', nodes: [] };
      const key = [location.href, map.text.length, job.locationText, job.structuredLocations.join('|')].join('§');
      if (force || key !== st.key || !badgeAttached()) {
        st.key = key;
        st.map = map;
        const s = st.settings;
        st.verdict = detect(
          { text: map.text, locationText: job.locationText, structuredLocations: job.structuredLocations },
          { country: s.country, timeZone: s.timeZone },
          st.pro ? { red: s.customRed, green: s.customGreen } : { red: [], green: [] },
        );
        st.saved = st.pro && (await savedJobs.list()).some((j) => j.url === location.href);
        const v = st.verdict;
        renderBadge(job.anchorEl, v, s, st.pro, {
          onQuote: (i) => { const e = v.evidence[i]; const r = st.map && rangeFor(st.map, e.start, e.end); if (r) focusRange(r); },
          onSettings: () => chrome.runtime.sendMessage({ type: 'wfw:openOptions' }),
          onSave: async () => {
            await savedJobs.add({ url: location.href, title: job.titleText, company: job.companyText, status: v.status, reason: v.reason, savedAt: new Date().toISOString() });
            st.saved = true;
            void run(true);
          },
        }, st.saved);
        highlightEvidence(map, v.evidence);
        if (v.status === 'red' || v.status === 'green') void recordSuccess(location.href.split(/[?#]/)[0]);
      }
    }
    if (st.pro && st.settings.listBadges && adapter.listItems) applyListBadges(adapter.listItems(document), st.settings);
    else clearListBadges();
  };

  watchPage(() => void run());
  onStorageChanged(async () => {
    st.settings = await loadSettings();
    st.pro = await isPro();
    void run(true);
  });
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'wfw:status' || msg?.type === 'wfw:check') {
      void run(msg.type === 'wfw:check').then(() => reply({ adapter: adapter.label, verdict: st.verdict && { status: st.verdict.status, reason: st.verdict.reason } }));
      return true;
    }
    return false;
  });
}

if (!window.__wfwLoaded) {
  window.__wfwLoaded = true;
  void main();
}
