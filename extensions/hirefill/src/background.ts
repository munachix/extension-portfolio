import { refreshLicenseIfStale } from '@ext/core';
import { LICENSE } from './store';

chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener((d) => {
  void refreshLicenseIfStale(LICENSE);
  if (d.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('app.html?tab=Setup') });
});
chrome.runtime.onStartup.addListener(() => void refreshLicenseIfStale(LICENSE));

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'hf:openPanel') {
    const tabId = sender.tab?.id;
    const open = tabId != null && chrome.sidePanel?.open ? chrome.sidePanel.open({ tabId }) : Promise.reject();
    open.catch(() => chrome.tabs.create({ url: chrome.runtime.getURL(`app.html${msg.tab ? `?tab=${msg.tab === 'settings' ? 'Settings' : msg.tab}` : ''}`) }));
  }
});
