/** Builds manifest.json. Content-script hosts come straight from the shared adapters. */
import { ADAPTERS } from '@ext/job-sites';

export const STORE_NAME = 'WorkFromWhere: Remote Job Location & Country Checker';
export const SUMMARY = 'See if a "remote" job accepts applicants from your country. Detects US-only, EU-only and time-zone limits instantly.';

export default function manifest({ version, dev, licenseHost }: { version: string; dev: boolean; licenseHost: string }) {
  const top = ADAPTERS.filter((a) => !a.allFrames).flatMap((a) => a.matches);
  const frames = ADAPTERS.filter((a) => a.allFrames).flatMap((a) => a.matches);
  return {
    manifest_version: 3,
    name: dev ? 'WorkFromWhere (dev)' : STORE_NAME,
    short_name: 'WorkFromWhere',
    version,
    description: SUMMARY,
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_popup: 'popup.html', default_title: 'WorkFromWhere', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    options_page: 'options.html',
    background: { service_worker: 'background.js' },
    // activeTab + scripting: "Check this page" on sites we don't list, only when the user clicks.
    permissions: ['storage', 'activeTab', 'scripting'],
    // Only the license server. Job sites are covered by content_scripts below.
    host_permissions: [licenseHost],
    content_scripts: [
      { matches: top, js: ['content.js'], run_at: 'document_idle' },
      { matches: frames, js: ['content.js'], run_at: 'document_idle', all_frames: true },
    ],
  };
}
