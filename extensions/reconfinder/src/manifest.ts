export const STORE_NAME = 'ReconFinder: Reconciliation Discrepancy Finder for QuickBooks Online';
export const SUMMARY = 'Reconciliation off by $X? See which transaction caused it: wrong clears, missed items, swapped digits, sign errors, duplicates.';
export default function manifest({ version, dev, licenseHost }: { version: string; dev: boolean; licenseHost: string }) {
  return {
    manifest_version: 3, name: dev ? 'ReconFinder (dev)' : STORE_NAME, short_name: 'ReconFinder', version, description: SUMMARY,
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_popup: 'popup.html', default_title: 'ReconFinder', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    background: { service_worker: 'background.js' },
    permissions: ['storage'],
    host_permissions: [licenseHost],
    content_scripts: [{ matches: ['https://qbo.intuit.com/*', 'https://*.qbo.intuit.com/*'], js: ['content.js'], run_at: 'document_idle', all_frames: false }],
  };
}
