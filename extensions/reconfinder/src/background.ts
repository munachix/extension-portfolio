import { refreshLicenseIfStale } from '@ext/core';
import { LICENSE } from './settings';
chrome.runtime.onInstalled.addListener(() => void refreshLicenseIfStale(LICENSE));
chrome.runtime.onStartup.addListener(() => void refreshLicenseIfStale(LICENSE));
