import { downloadText, isPro, toCsv } from '@ext/core';
import { renderPaywall } from '@ext/ui';
import { DEFAULT_FEES, FEES_AS_OF, outcome, PLATFORMS } from '../fees';
import { fees, FREE_FEATURES, inventory, LICENSE, PRICE, PRO_FEATURES, PRODUCT, prefs } from '../settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

async function init() {
  const pro = await isPro();
  const pr = await prefs.get();
  const t = await fees.get();
  // Quick calculator
  for (const [id, v] of [['price', ''], ['cost', pr.cost || ''], ['ship', pr.shipCost], ['target', pr.target]] as const) ($(id) as HTMLInputElement).value = String(v);
  const cat = $('cat') as HTMLSelectElement;
  for (const [k, c] of Object.entries(DEFAULT_FEES.ebay.categories)) cat.add(new Option(c.label, k, false, k === pr.ebayCategory));
  ($('boost') as HTMLInputElement).checked = pr.depopBoosted;
  const draw = () => {
    const s = { price: Number(($('price') as HTMLInputElement).value) || 0, buyerShipping: 0, shipCost: Number(($('ship') as HTMLInputElement).value) || 0, cost: Number(($('cost') as HTMLInputElement).value) || 0, ebayCategory: cat.value as 'most', depopBoosted: ($('boost') as HTMLInputElement).checked };
    $('out').replaceChildren(...PLATFORMS.map((p) => { const o = outcome(p, s, t); const tr = document.createElement('tr'); tr.innerHTML = '<td></td><td></td><td></td>'; tr.children[0].textContent = o.name; tr.children[1].textContent = money(o.fee); tr.children[2].textContent = money(o.profit); return tr; }));
  };
  for (const id of ['price', 'cost', 'ship', 'cat', 'boost', 'target']) $(id).addEventListener('input', () => {
    draw();
    void prefs.set({ cost: Number(($('cost') as HTMLInputElement).value) || 0, shipCost: Number(($('ship') as HTMLInputElement).value) || 0, target: Number(($('target') as HTMLInputElement).value) || 0, ebayCategory: cat.value as 'most', depopBoosted: ($('boost') as HTMLInputElement).checked });
  });
  draw();
  $('asof').textContent = `US fees as of ${FEES_AS_OF}.`;
  document.querySelectorAll<HTMLElement>('.pro-only').forEach((e) => e.classList.toggle('x-locked', !pro));

  // Fee overrides (Pro)
  const pct = $('feePct') as HTMLTextAreaElement;
  pct.value = PLATFORMS.map((p) => `${p}=${((t[p] as { pct: number }).pct * 100).toFixed(2)}`).join('\n');
  $('saveFees').addEventListener('click', async () => {
    const next = structuredClone(t);
    for (const line of pct.value.split('\n')) { const [k, v] = line.split('='); if (PLATFORMS.includes(k?.trim() as 'ebay') && Number.isFinite(Number(v))) (next[k.trim() as 'ebay'] as { pct: number }).pct = Number(v) / 100; }
    await fees.set(next);
    $('feeMsg').textContent = 'Saved.';
  });
  $('resetFees').addEventListener('click', async () => { await fees.reset(); location.reload(); });

  // Inventory (Pro)
  const inv = await inventory.list();
  $('inv').textContent = pro ? `${inv.length} saved item(s)` : '';
  ($('csv') as HTMLButtonElement).hidden = !(pro && inv.length);
  $('csv').addEventListener('click', () => downloadText('flipcomps-inventory.csv', toCsv(inv as unknown as Record<string, unknown>[], ['title', 'platform', 'cost', 'price', 'url', 'savedAt'])));
  await renderPaywall($('pro'), { config: LICENSE, productName: PRODUCT, priceText: PRICE, features: PRO_FEATURES, freeText: FREE_FEATURES, onChange: () => location.reload() });
}
void init();
