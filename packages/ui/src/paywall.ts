/**
 * Upgrade box for extension pages: shows Pro status, a Buy button, and a
 * license-key field. Plain DOM, no framework.
 */
import { activateLicense, deactivateLicense, getCachedLicense, isPro, type LicenseConfig } from '@ext/core';

export interface PaywallOptions {
  config: LicenseConfig;
  productName: string;
  /** e.g. "$4.99/month or $29 lifetime" */
  priceText: string;
  /** Bullet list of what Pro adds. */
  features: string[];
  onChange?: (pro: boolean) => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const n = Object.assign(document.createElement(tag), props) as HTMLElementTagNameMap[K];
  n.append(...kids);
  return n;
};

export async function renderPaywall(root: HTMLElement, opts: PaywallOptions): Promise<void> {
  root.replaceChildren();
  root.classList.add('x-card');
  const pro = await isPro();

  if (pro) {
    const cached = await getCachedLicense();
    const masked = cached ? `${cached.key.slice(0, 4)}…${cached.key.slice(-4)}` : '';
    const remove = el('button', { type: 'button', textContent: 'Remove key' });
    remove.addEventListener('click', async () => {
      await deactivateLicense();
      opts.onChange?.(false);
      await renderPaywall(root, opts);
    });
    root.append(
      el('div', { className: 'x-row' }, el('h2', { textContent: `${opts.productName} Pro` }), el('span', { className: 'x-pill pro', textContent: 'Active' })),
      el('p', { className: 'x-muted', textContent: `License ${masked}${cached?.result.expiresAt ? ` · renews/expires ${new Date(cached.result.expiresAt).toLocaleDateString()}` : ''}` }),
      remove,
    );
    return;
  }

  const list = el('ul');
  list.style.cssText = 'margin:6px 0 10px;padding-left:18px';
  for (const f of opts.features) list.append(el('li', { textContent: f }));
  const buy = el('a', { className: 'x-btn primary', href: opts.config.checkoutUrl, target: '_blank', rel: 'noopener', textContent: `Get Pro · ${opts.priceText}` });
  const input = el('input', { type: 'text', placeholder: 'Paste your license key', autocomplete: 'off', spellcheck: false });
  input.setAttribute('aria-label', 'License key');
  const activate = el('button', { type: 'button', textContent: 'Activate' });
  const msg = el('div', { className: 'x-msg', role: 'status' });

  activate.addEventListener('click', async () => {
    activate.disabled = true;
    msg.className = 'x-msg';
    msg.textContent = 'Checking…';
    const r = await activateLicense(input.value, opts.config);
    activate.disabled = false;
    if (r.valid) {
      opts.onChange?.(true);
      await renderPaywall(root, opts);
    } else {
      msg.className = 'x-msg err';
      msg.textContent = r.error ?? 'That key is not valid.';
    }
  });

  root.append(
    el('h2', { textContent: `Upgrade to ${opts.productName} Pro` }),
    list,
    buy,
    el('label', { textContent: 'Already bought? Enter your key' }),
    el('div', { className: 'x-row' }, input, activate),
    msg,
  );
}
