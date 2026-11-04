/**
 * Calls `onChange` when the page's content changes, including single-page-app
 * navigation (LinkedIn, SEEK and Indeed swap jobs without reloading).
 * Content scripts can't see the page's history.pushState, so we watch the DOM
 * and the URL, debounced.
 */
export function watchPage(onChange: () => void, opts: { debounceMs?: number; root?: Node } = {}): () => void {
  const wait = opts.debounceMs ?? 250;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastUrl = location.href;
  const fire = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; onChange(); }, wait);
  };
  const mo = new MutationObserver((records) => {
    // Ignore mutations caused only by our own UI.
    if (records.every((r) => (r.target as Element).closest?.('[data-x-ext-ui]'))) return;
    fire();
  });
  mo.observe(opts.root ?? document.documentElement, { childList: true, subtree: true, characterData: true });
  const urlTimer = setInterval(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; fire(); }
  }, 500);
  fire();
  return () => { mo.disconnect(); clearInterval(urlTimer); if (timer) clearTimeout(timer); };
}
