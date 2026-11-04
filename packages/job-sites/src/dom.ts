/** DOM helpers shared by all site adapters. Keep selectors in the adapter files. */

export const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** First element matching any selector, in order. */
export function first(root: ParentNode, selectors: string[]): Element | null {
  for (const s of selectors) {
    const e = root.querySelector(s);
    if (e) return e;
  }
  return null;
}

export function textOf(root: ParentNode, selectors: string[]): string {
  return clean(first(root, selectors)?.textContent);
}

/** All texts for elements matching any selector (deduped, non-empty). */
export function textsOf(root: ParentNode, selectors: string[]): string[] {
  const out = new Set<string>();
  for (const s of selectors) root.querySelectorAll(s).forEach((e) => { const t = clean(e.textContent); if (t) out.add(t); });
  return [...out];
}

/** The element with the most text among matches (for pages with several similar blocks). */
export function largest(root: ParentNode, selector: string): Element | null {
  let best: Element | null = null;
  let n = 0;
  root.querySelectorAll(selector).forEach((e) => {
    const len = e.textContent?.length ?? 0;
    if (len > n) { n = len; best = e; }
  });
  return best;
}

interface JsonLdJobPosting {
  '@type'?: string | string[];
  applicantLocationRequirements?: unknown;
  jobLocation?: unknown;
  jobLocationType?: string;
}

const nameOf = (v: unknown): string[] => {
  if (!v) return [];
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(nameOf);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.name === 'string') return [o.name];
    if (o.address) return nameOf((o.address as Record<string, unknown>).addressCountry);
  }
  return [];
};

/**
 * Applicant location requirements from schema.org JobPosting JSON-LD.
 * Only `applicantLocationRequirements` is used: `jobLocation` is often the
 * company office, not who may apply.
 */
export function structuredApplicantLocations(root: ParentNode): string[] {
  const out = new Set<string>();
  root.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    let data: unknown;
    try { data = JSON.parse(s.textContent ?? ''); } catch { return; }
    const items = Array.isArray(data) ? data : [data, ...(((data as Record<string, unknown>)?.['@graph'] as unknown[]) ?? [])];
    for (const it of items as JsonLdJobPosting[]) {
      if (!it) continue;
      const t = it['@type'];
      if (!(t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting')))) continue;
      for (const n of nameOf(it.applicantLocationRequirements)) if (clean(n)) out.add(clean(n));
    }
  });
  return [...out];
}

/**
 * Fallback when no selector matches: the block-level element whose own
 * paragraphs/list items hold the most text. Works on most job pages.
 */
export function guessDescription(doc: Document): Element | null {
  let best: Element | null = null;
  let bestScore = 0;
  doc.querySelectorAll('article, main, section, div').forEach((e) => {
    const paras = e.querySelectorAll(':scope > p, :scope > ul, :scope > ol, :scope > h2, :scope > h3, :scope > div > p');
    if (paras.length < 3) return;
    let len = 0;
    paras.forEach((p) => (len += p.textContent?.length ?? 0));
    if (len > bestScore) { bestScore = len; best = e; }
  });
  return bestScore > 400 ? best : null;
}
