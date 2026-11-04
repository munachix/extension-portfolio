/**
 * Maps a description element to plain text (with offsets back to DOM text
 * nodes) and highlights sentences with the CSS Custom Highlight API, which
 * paints without changing the page's DOM, so React-based sites don't break.
 */
import type { Evidence } from '../engine/detect';

export interface TextMap {
  text: string;
  nodes: { node: Text; start: number }[];
}

const BLOCK = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'PRE', 'DD', 'DT', 'TABLE']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG']);

function blockOf(n: Node, root: Element): Element {
  let e = n.parentElement;
  while (e && e !== root && !BLOCK.has(e.tagName)) e = e.parentElement;
  return e ?? root;
}

export function buildTextMap(root: Element): TextMap {
  const nodes: TextMap['nodes'] = [];
  let text = '';
  let lastBlock: Element | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        const el = n as Element;
        if (SKIP.has(el.tagName.toUpperCase()) || el.hasAttribute('data-x-ext-ui')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (!t.data) continue;
    const block = blockOf(t, root);
    const prev = t.previousSibling as Element | null;
    if ((lastBlock && block !== lastBlock) || prev?.tagName === 'BR') text += '\n';
    lastBlock = block;
    nodes.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, nodes };
}

function locate(map: TextMap, offset: number): { node: Text; offset: number } | null {
  let lo = 0, hi = map.nodes.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (map.nodes[mid].start <= offset) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (best < 0) return null;
  const { node, start } = map.nodes[best];
  return { node, offset: Math.min(offset - start, node.data.length) };
}

export function rangeFor(map: TextMap, start: number, end: number): Range | null {
  const a = locate(map, start);
  const b = locate(map, end);
  if (!a || !b) return null;
  const r = document.createRange();
  try {
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset);
  } catch {
    return null;
  }
  return r;
}

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.setAttribute('data-x-ext-ui', '');
  s.textContent = `::highlight(wfw-red){background-color:rgba(255,72,72,.32)} ::highlight(wfw-green){background-color:rgba(30,190,110,.28)} ::highlight(wfw-focus){background-color:rgba(255,200,0,.55)}`;
  (document.head ?? document.documentElement).appendChild(s);
}

const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS;

export function highlightEvidence(map: TextMap, evidence: Evidence[]): Range[] {
  const ranges: Range[] = [];
  if (!supported()) return ranges;
  ensureStyle();
  const red: Range[] = [], green: Range[] = [];
  for (const e of evidence) {
    if (e.start < 0 || e.effect === 'neutral') continue;
    const r = rangeFor(map, e.start, e.end);
    if (!r) continue;
    (e.effect === 'red' ? red : green).push(r);
    ranges.push(r);
  }
  CSS.highlights.set('wfw-red', new Highlight(...red));
  CSS.highlights.set('wfw-green', new Highlight(...green));
  return ranges;
}

export function focusRange(r: Range): void {
  if (supported()) { ensureStyle(); CSS.highlights.set('wfw-focus', new Highlight(r)); }
  const rect = r.getBoundingClientRect();
  const el = r.startContainer.parentElement;
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  else window.scrollTo({ top: window.scrollY + rect.top - innerHeight / 2, behavior: 'smooth' });
}

export function clearHighlights(): void {
  if (!supported()) return;
  for (const k of ['wfw-red', 'wfw-green', 'wfw-focus']) CSS.highlights.delete(k);
}
