/** Country + time-zone pickers shared by the popup and the options page. */
import { countryOptions } from './engine/places';
import { loadSettings, saveSettings } from './settings';

export async function mountProfileForm(root: HTMLElement): Promise<void> {
  const s = await loadSettings();
  root.innerHTML = `
    <label for="wfw-country">I live in</label>
    <select id="wfw-country"><option value="">Choose your country…</option></select>
    <label for="wfw-tz">My time zone</label>
    <select id="wfw-tz"></select>
    <div class="x-msg ok" id="wfw-saved" hidden>Saved</div>`;
  const country = root.querySelector<HTMLSelectElement>('#wfw-country')!;
  for (const c of countryOptions()) country.add(new Option(c.name, c.code, false, c.code === s.country));
  const tz = root.querySelector<HTMLSelectElement>('#wfw-tz')!;
  const zones = Intl.supportedValuesOf?.('timeZone') ?? [s.timeZone ?? 'UTC'];
  for (const z of zones) tz.add(new Option(z.replace(/_/g, ' '), z, false, z === s.timeZone));
  const saved = root.querySelector<HTMLElement>('#wfw-saved')!;
  const save = async () => {
    await saveSettings({ country: country.value || null, timeZone: tz.value || null });
    saved.hidden = false;
    setTimeout(() => (saved.hidden = true), 1200);
  };
  country.addEventListener('change', save);
  tz.addEventListener('change', save);
  // Persist the guessed defaults so content scripts agree with what's shown.
  if (s.country) await saveSettings({ country: s.country, timeZone: s.timeZone });
}
