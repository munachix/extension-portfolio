export const STORE_NAME = 'FlipComps: Sold Prices & Profit Calculator for eBay, Poshmark & Mercari';
export const SUMMARY = 'See what an item really sells for and what you’d keep on eBay, Poshmark, Mercari, Depop & Etsy, right on the listing.';
export default function manifest({ version, dev, licenseHost }: { version: string; dev: boolean; licenseHost: string }) {
  return {
    manifest_version: 3, name: dev ? 'FlipComps (dev)' : STORE_NAME, short_name: 'FlipComps', version, description: SUMMARY,
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_popup: 'popup.html', default_title: 'FlipComps', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    background: { service_worker: 'background.js' },
    permissions: ['storage'],
    host_permissions: [licenseHost],
    content_scripts: [{ matches: ['https://www.ebay.com/*', 'https://poshmark.com/*', 'https://www.mercari.com/*', 'https://www.depop.com/*', 'https://www.etsy.com/*'], js: ['content.js'], run_at: 'document_idle' }],
  };
}
