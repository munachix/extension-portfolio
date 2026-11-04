/**
 * WorkFromWhere detection engine. Pure function, no DOM, no network.
 *
 *   detect({ text, locationText, structuredLocations }, { country, timeZone })
 *     -> { status: green | red | yellow | unset, reason, evidence[], timezones[] }
 *
 * Rules: any restriction that excludes the user's country -> red.
 * A restriction that includes them, or a "worldwide" phrase -> green.
 * Restrictions that disagree -> yellow ("mixed"). Nothing found -> yellow.
 */
import rules from './rules.json';
import { type Code, type Mention, displayName, findMentions, includesCountry, sizeOf, countryName } from './places';
import { splitSentences, type Sentence } from './sentences';
import { findTimeZones, fmtOffset, zoneOffset, type TimeZoneReq } from './timezones';

export type Status = 'green' | 'red' | 'yellow' | 'unset';
export type Source = 'description' | 'location' | 'structured';

export interface Evidence {
  kind: 'restrict' | 'exclude' | 'worldwide' | 'timezone' | 'custom' | 'marker';
  source: Source;
  /** Offsets of the whole sentence in the input text (description source only). */
  start: number;
  end: number;
  text: string;
  allowed: Code[];
  excluded: Code[];
  effect: 'red' | 'green' | 'neutral';
  label: string;
  /** Time-zone evidence: allowed UTC offset band in minutes. */
  band?: [number, number];
}

export interface Verdict {
  status: Status;
  reason: string;
  evidence: Evidence[];
  timezones: TimeZoneReq[];
}

export interface Profile { country: Code | null; timeZone: string | null }
export interface CustomRules { red: string[]; green: string[] }
export interface DetectInput { text: string; locationText?: string; structuredLocations?: string[] }

interface KeywordRule { id: string; re: RegExp; before: number; after: number; strength: 'strong' | 'weak' }
const ci = (s: string) => new RegExp(s, 'giu');
const RESTRICT: KeywordRule[] = rules.restrict.map((r) => ({ ...r, re: ci(r.re), strength: r.strength as 'strong' | 'weak' }));
const EXCLUDE = rules.exclude.map((r) => ({ ...r, re: ci(r.re) }));
const MARKERS = rules.markers.map((r) => ({ ...r, re: new RegExp(r.re, 'u') }));
const WORLDWIDE = rules.worldwide.map(ci);
const WW_NOT_NEAR = new RegExp(rules.worldwideNotNear, 'iu');
const COMPANY = new RegExp(rules.companyContext, 'iu');
const REMOTE = ci(rules.remoteWords);
const REMOTE_ONE = new RegExp(rules.remoteWords, 'iu');
const ADJ_GAP = /^[\s()[\]\-–—,:/|·]*(?:(?:in|within|from|across|throughout|anywhere in|the|only|based|aus|innerhalb|nur|ganz|in ganz)\s*[\s()[\]\-–—,:/|·]*)*$/i;
const LIST_GAP = /^[\s,/&|·]*(?:or|and|und|oder|&|\+)?[\s,/]*(?:the\s+)?$/i;
const FOLLOW_IN = /^\s*(?:in|within|across|throughout|innerhalb|in ganz)\s+(?:the\s+|der\s+|von\s+)?/i;

function names(codes: Code[], max = 3): string {
  const n = [...new Set(codes)].map(displayName);
  return n.length <= max ? joinAnd(n) : `${n.slice(0, max).join(', ')} +${n.length - max} more`;
}
const joinAnd = (n: string[]) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}`);

/** Grow a set of chosen mentions to the rest of a list: "US, Canada or Mexico". */
function extendList(chosen: Mention[], all: Mention[], text: string, base: number): Mention[] {
  const out = [...chosen];
  for (const m of all) {
    if (out.includes(m)) continue;
    const last = out.filter((o) => o.end <= m.start).sort((a, b) => b.end - a.end)[0];
    if (last && LIST_GAP.test(text.slice(last.end - base, m.start - base))) out.push(m);
  }
  return out.sort((a, b) => a.start - b.start);
}

function evalSentence(s: Sentence, mentions: Mention[], source: Source, custom: CustomRules, out: Evidence[], tzs: TimeZoneReq[], now: Date) {
  const lower = s.text.toLowerCase();
  const ev = (kind: Evidence['kind'], label: string, allowed: Code[] = [], excluded: Code[] = [], effect: Evidence['effect'] = 'neutral'): Evidence =>
    ({ kind, source, start: s.start, end: s.end, text: s.text, allowed, excluded, effect, label });
  const rel = (abs: number) => abs - s.start;

  for (const p of custom.red) if (p.trim() && lower.includes(p.trim().toLowerCase())) out.push(ev('custom', `Your rule: “${p.trim()}”`, [], [], 'red'));
  for (const p of custom.green) if (p.trim() && lower.includes(p.trim().toLowerCase())) out.push(ev('custom', `Your rule: “${p.trim()}”`, [], [], 'green'));

  const consumed = new Set<Mention>();
  const inRange = (a: number, b: number) => mentions.filter((m) => !consumed.has(m) && m.start >= a && m.start <= b);

  // 1. Exclusions: "except India", "we can't hire in Russia"
  for (const r of EXCLUDE) {
    for (const m of s.text.matchAll(r.re)) {
      const end = s.start + m.index! + m[0].length;
      const hits = extendList(inRange(end, end + r.after).slice(0, 1), inRange(end, end + r.after + 40), s.text, s.start);
      if (!hits.length) continue;
      hits.forEach((h) => consumed.add(h));
      out.push(ev('exclude', `Excludes ${names(hits.map((h) => h.code))}`, [], hits.map((h) => h.code)));
    }
  }

  const allowed: Mention[] = [];
  let restrictLabel = '';

  // 2. Worldwide phrases — unless followed by "in <place>" ("anywhere in the US")
  for (const re of WORLDWIDE) {
    for (const m of s.text.matchAll(re)) {
      const endRel = m.index! + m[0].length;
      const follow = s.text.slice(endRel, endRel + 45);
      const f = follow.match(FOLLOW_IN);
      if (f) {
        const at = s.start + endRel + f[0].length;
        const hits = inRange(at, at + 2);
        if (hits.length) {
          allowed.push(...extendList(hits, inRange(at, at + 60), s.text, s.start));
          restrictLabel ||= m[0];
          continue;
        }
      }
      const around = s.text.slice(Math.max(0, m.index! - 30), endRel + 30);
      if (WW_NOT_NEAR.test(around) && !REMOTE_ONE.test(around)) continue;
      if (!out.some((e) => e.kind === 'worldwide' && e.start === s.start && e.source === source)) out.push(ev('worldwide', 'Open worldwide', [], [], 'green'));
    }
  }

  // 3. Hard markers: W-2, ITAR …
  for (const mk of MARKERS) {
    if (mk.re.test(s.text)) out.push(ev('marker', mk.label, mk.codes, []));
  }

  // 4. Restriction phrases with a place name nearby
  const companyTalk = COMPANY.test(s.text);
  for (const r of RESTRICT) {
    if (r.strength === 'weak' && companyTalk) continue;
    for (const m of s.text.matchAll(r.re)) {
      const a = s.start + m.index!;
      const b = a + m[0].length;
      let hits = inRange(b, b + r.after);
      if (!hits.length && r.before) hits = mentions.filter((x) => !consumed.has(x) && x.end <= a && x.end >= a - r.before);
      if (!hits.length) continue;
      allowed.push(...extendList(hits, inRange(a - r.before, b + r.after + 40), s.text, s.start));
      restrictLabel ||= m[0];
    }
  }

  // 5. "Remote (US)", "US Remote", "Remote – EMEA"
  for (const m of s.text.matchAll(REMOTE)) {
    const a = s.start + m.index!;
    const b = a + m[0].length;
    for (const x of mentions) {
      if (consumed.has(x)) continue;
      const gap = x.start >= b ? s.text.slice(rel(b), rel(x.start)) : x.end <= a ? s.text.slice(rel(x.end), rel(a)) : null;
      if (gap != null && gap.length <= 22 && ADJ_GAP.test(gap)) {
        allowed.push(...extendList([x], mentions.filter((y) => !consumed.has(y)), s.text, s.start));
        restrictLabel ||= m[0];
      }
    }
  }

  // Location fields ("United States", "Lagos, Nigeria (Remote)") are themselves a statement of where.
  if (source !== 'description' && !allowed.length && !out.some((e) => e.kind === 'worldwide' && e.start === s.start)) {
    allowed.push(...mentions.filter((x) => !consumed.has(x)));
  }

  const codes = [...new Set(allowed.filter((x) => !consumed.has(x)).map((x) => x.code))];
  if (codes.length) out.push(ev('restrict', source === 'location' ? `Job location: ${names(codes)}` : `Only open to ${names(codes)}`, codes));

  // 6. Time zones
  if (source === 'description') {
    for (const tz of findTimeZones(s.text, s.start, now)) {
      tzs.push(tz);
      if (tz.band) out.push({ ...ev('timezone', `Time zone limit: ${fmtOffset(tz.band[0])} to ${fmtOffset(tz.band[1])}`), band: tz.band });
    }
  }
}

export function detect(input: DetectInput, profile: Profile, custom: CustomRules = { red: [], green: [] }, now = new Date()): Verdict {
  const evidence: Evidence[] = [];
  const timezones: TimeZoneReq[] = [];
  const text = input.text ?? '';
  const allMentions = findMentions(text);

  for (const s of splitSentences(text)) {
    const ms = allMentions.filter((m) => m.start >= s.start && m.end <= s.end);
    evalSentence(s, ms, 'description', custom, evidence, timezones, now);
  }
  const sideTexts: [Source, string][] = [];
  if (input.locationText?.trim()) sideTexts.push(['location', input.locationText.trim()]);
  for (const l of input.structuredLocations ?? []) if (l.trim()) sideTexts.push(['structured', l.trim()]);
  for (const [source, t] of sideTexts) {
    const s: Sentence = { start: 0, end: t.length, text: t };
    const before = evidence.length;
    evalSentence(s, findMentions(t), source, { red: [], green: [] }, evidence, timezones, now);
    // offsets of side texts don't point into the description
    for (let i = before; i < evidence.length; i++) { evidence[i].start = -1; evidence[i].end = -1; }
  }

  const user = profile.country;
  if (!user) return { status: 'unset', reason: 'Choose your country to see results', evidence, timezones };

  const userOffset = profile.timeZone ? zoneOffset(profile.timeZone, now) : null;
  for (const e of evidence) {
    if (e.kind === 'restrict' || e.kind === 'marker') e.effect = e.allowed.some((c) => includesCountry(c, user)) ? 'green' : 'red';
    else if (e.kind === 'exclude') e.effect = e.excluded.some((c) => includesCountry(c, user)) ? 'red' : 'neutral';
    else if (e.kind === 'timezone' && e.band && userOffset != null) {
      e.effect = userOffset >= e.band[0] && userOffset <= e.band[1] ? 'green' : 'red';
    }
  }

  const hard = (e: Evidence) => e.source !== 'location';
  const customRed = evidence.find((e) => e.kind === 'custom' && e.effect === 'red');
  const reds = evidence.filter((e) => hard(e) && e.effect === 'red' && e.kind !== 'custom');
  const greens = evidence.filter((e) => hard(e) && e.effect === 'green' && (e.kind === 'restrict' || e.kind === 'marker'));
  const worldwide = evidence.find((e) => e.kind === 'worldwide' && e.source !== 'location') ?? evidence.find((e) => e.kind === 'worldwide');
  const loc = evidence.find((e) => e.source === 'location' && e.kind === 'restrict');
  const customGreen = evidence.find((e) => e.kind === 'custom' && e.effect === 'green');
  const you = countryName(user);

  const bestMatch = (es: Evidence[]) => {
    const codes = es.flatMap((e) => e.allowed).filter((c) => includesCountry(c, user));
    return codes.sort((a, b) => sizeOf(a) - sizeOf(b))[0];
  };
  const redReason = (e: Evidence) => (e.kind === 'exclude' ? `Not open to ${you}` : e.label);

  if (customRed) return { status: 'red', reason: customRed.label, evidence, timezones };
  if (reds.length && greens.length) return { status: 'yellow', reason: `Mixed signals: ${redReason(reds[0])}, but also open to ${displayName(bestMatch(greens))}`, evidence, timezones };
  if (reds.length) return { status: 'red', reason: redReason(reds[0]), evidence, timezones };
  if (greens.length) return { status: 'green', reason: `Open to ${displayName(bestMatch(greens))}`, evidence, timezones };
  if (worldwide) return { status: 'green', reason: 'Open worldwide', evidence, timezones };
  if (loc) return loc.effect === 'red'
    ? { status: 'red', reason: `${loc.label} (not ${you})`, evidence, timezones }
    : { status: 'green', reason: `Job location includes ${displayName(bestMatch([loc]))}`, evidence, timezones };
  if (customGreen) return { status: 'green', reason: customGreen.label, evidence, timezones };
  return { status: 'yellow', reason: 'No location rule found — check the post', evidence, timezones };
}

/** Classify a search-result card from its location text only. */
export function detectCard(locationText: string, profile: Profile): Verdict {
  return detect({ text: '', locationText }, profile);
}
