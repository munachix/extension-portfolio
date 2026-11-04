import { refreshLicenseIfStale } from '@ext/core';
import { LICENSE } from './settings';

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') void chrome.runtime.openOptionsPage();
  void refreshLicenseIfStale(LICENSE);
});
chrome.runtime.onStartup.addListener(() => void refreshLicenseIfStale(LICENSE));

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'wfw:openOptions') void chrome.runtime.openOptionsPage();
});
