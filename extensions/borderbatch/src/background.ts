import { refreshLicenseIfStale } from '@ext/core';
import { LICENSE } from './settings';
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(() => void refreshLicenseIfStale(LICENSE));
chrome.runtime.onStartup.addListener(() => void refreshLicenseIfStale(LICENSE));
