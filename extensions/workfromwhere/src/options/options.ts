import { isPro } from '@ext/core';
import { ADAPTERS } from '@ext/job-sites';
import { renderPaywall } from '@ext/ui';
import { mountProfileForm } from '../form';
import { LICENSE, PRICE, PRO_FEATURES, FREE_FEATURES, PRODUCT, loadSettings, saveSettings } from '../settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

async function proSettings() {
  const pro = await isPro();
  const s = await loadSettings();
  const root = $('pro-settings');
  root.classList.toggle('x-locked', !pro);
  $('pro-note').hidden = pro;
  const listBadges = $<HTMLInputElement>('listBadges');
  const hideRed = $<HTMLInputElement>('hideRed');
  const red = $<HTMLTextAreaElement>('customRed');
  const green = $<HTMLTextAreaElement>('customGreen');
  listBadges.checked = s.listBadges;
  hideRed.checked = s.hideRed;
  red.value = s.customRed.join('\n');
  green.value = s.customGreen.join('\n');
  const save = () => saveSettings({ listBadges: listBadges.checked, hideRed: hideRed.checked, customRed: lines(red.value), customGreen: lines(green.value) });
  for (const el of [listBadges, hideRed]) el.onchange = save;
  for (const el of [red, green]) el.onblur = save;
}

async function init() {
  await mountProfileForm($('profile'));
  await renderPaywall($('pro'), { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, freeText: FREE_FEATURES, onChange: () => void proSettings() });
  await proSettings();
  $('sites').textContent = ADAPTERS.map((a) => a.label).join(' · ');
}

void init();
