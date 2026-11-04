export const STORE_NAME = 'BorderBatch: No-Crop Borders & Watermark for Instagram';
export const SUMMARY = 'Batch-add white borders, 4:5 no-crop frames & watermarks to photos in your browser. Removes GPS data. Nothing is uploaded.';
export default function manifest({ version, dev, licenseHost }: { version: string; dev: boolean; licenseHost: string }) {
  return {
    manifest_version: 3, name: dev ? 'BorderBatch (dev)' : STORE_NAME, short_name: 'BorderBatch', version, description: SUMMARY,
    minimum_chrome_version: '116',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_title: 'Open BorderBatch', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    side_panel: { default_path: 'panel.html' },
    options_page: 'panel.html',
    background: { service_worker: 'background.js' },
    permissions: ['storage', 'sidePanel'],
    // No access to any website. Only the license server, for Pro keys.
    host_permissions: [licenseHost],
  };
}
