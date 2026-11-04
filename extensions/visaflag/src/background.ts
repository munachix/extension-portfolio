import { isPro, refreshLicenseIfStale } from '@ext/core';
import { lookup, sync } from './data';
import { activeCountries, DATA_BASE, LICENSE, loadSettings } from './settings';

const WEEK_MIN = 7 * 24 * 60;

async function syncNow(force = false) {
  const s = await loadSettings();
  return sync(DATA_BASE, activeCountries(s, await isPro()), force);
}

chrome.runtime.onInstalled.addListener((d) => {
  chrome.alarms.create('vf-sync', { periodInMinutes: WEEK_MIN });
  void refreshLicenseIfStale(LICENSE);
  void syncNow();
  if (d.reason === 'install') void chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => { void refreshLicenseIfStale(LICENSE); void syncNow(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'vf-sync') void syncNow(); });
chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && (c.settings || c.license)) void syncNow(); });

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    if (msg?.type === 'vf:lookup') {
      const s = await loadSettings();
      const pro = await isPro();
      const countries = activeCountries(s, pro);
      const names: string[] = [...new Set((msg.names as string[]).filter(Boolean))].slice(0, 100);
      const results: Record<string, unknown> = {};
      for (const n of names) results[n] = await lookup(n, countries, pro);
      return { pro, settings: s, results };
    }
    if (msg?.type === 'vf:sync') return syncNow(!!msg.force);
    if (msg?.type === 'vf:openOptions') { await chrome.runtime.openOptionsPage(); return true; }
    return undefined;
  })().then(reply, (e) => reply({ error: String(e) }));
  return true;
});
