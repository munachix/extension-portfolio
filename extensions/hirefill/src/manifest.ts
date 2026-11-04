/** Job application portals HireFill fills (all frames: iCIMS and Taleo put the form in an iframe). */
export const PORTAL_MATCHES = [
  'https://*.myworkdayjobs.com/*', 'https://*.myworkdaysite.com/*', 'https://*.myworkday.com/*',
  'https://boards.greenhouse.io/*', 'https://job-boards.greenhouse.io/*', 'https://job-boards.eu.greenhouse.io/*', 'https://boards.eu.greenhouse.io/*',
  'https://jobs.lever.co/*', 'https://jobs.eu.lever.co/*',
  'https://*.icims.com/*', 'https://*.taleo.net/*', 'https://*.oraclecloud.com/*',
  'https://jobs.smartrecruiters.com/*', 'https://jobs.ashbyhq.com/*', 'https://*.bamboohr.com/*', 'https://apply.workable.com/*',
  'https://*.applytojob.com/*', 'https://*.successfactors.com/*', 'https://*.successfactors.eu/*', 'https://*.sapsf.com/*',
  'https://www.linkedin.com/*', 'https://*.indeed.com/*',
];
export const STORE_NAME = 'HireFill: Job Application Autofill & Resume Tailor';
export const SUMMARY = 'Autofill job applications on Workday, Greenhouse, Lever & more. Tailor your CV to each job. One-time payment, no subscription.';

export default function manifest({ version, dev, licenseHost }: { version: string; dev: boolean; licenseHost: string }) {
  return {
    manifest_version: 3,
    name: dev ? 'HireFill (dev)' : STORE_NAME,
    short_name: 'HireFill',
    version,
    description: SUMMARY,
    minimum_chrome_version: '116',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_title: 'Open HireFill', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    side_panel: { default_path: 'app.html' },
    options_page: 'app.html',
    background: { service_worker: 'background.js' },
    permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'scripting', 'activeTab'],
    host_permissions: [licenseHost],
    optional_host_permissions: ['https://api.openai.com/*', 'https://api.anthropic.com/*', 'https://generativelanguage.googleapis.com/*'],
    content_scripts: [{ matches: PORTAL_MATCHES, js: ['content.js'], run_at: 'document_idle', all_frames: true }],
    web_accessible_resources: [],
  };
}
