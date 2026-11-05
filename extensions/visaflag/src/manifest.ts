import { ADAPTERS } from '@ext/job-sites';
import cfg from '../extension.config.json';

export const STORE_NAME = 'VisaFlag: Visa Sponsor Checker – UK, US H-1B, Canada, NL';
export const SUMMARY = 'See if a company sponsors work visas while you browse LinkedIn & Indeed. UK sponsor list, H-1B history, Canada LMIA, Dutch IND.';

export default function manifest({ version, dev, licenseHost, dataUrl }: { version: string; dev: boolean; licenseHost: string; dataUrl?: string }) {
  const sites = ADAPTERS.filter((a) => cfg.sites.includes(a.id));
  return {
    manifest_version: 3,
    name: dev ? 'VisaFlag (dev)' : STORE_NAME,
    short_name: 'VisaFlag',
    version,
    description: SUMMARY,
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_popup: 'popup.html', default_title: 'VisaFlag', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    options_page: 'options.html',
    background: { service_worker: 'background.js' },
    permissions: ['storage', 'alarms'],
    host_permissions: [`${new URL(dataUrl || cfg.dataBaseUrl).origin}/*`, licenseHost],
    content_scripts: [{ matches: sites.flatMap((a) => a.matches), js: ['content.js'], run_at: 'document_idle' }],
  };
}
